import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    private var pendingLikes: Set<UUID> = []
    var likeError: String?
    private var currentUserId: String?

    var timeline: [Post] {
        posts.sorted { $0.createdAt > $1.createdAt }
    }

    var mine: [Post] {
        timeline.filter(\.isMine)
    }

    var thisWeekCount: Int {
        let calendar = Calendar.current
        guard let start = calendar.dateInterval(of: .weekOfYear, for: Date())?.start else {
            return mine.count
        }
        return mine.filter { $0.createdAt >= start }.count
    }

    func add(body: String, user: AuthManager.User) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters else { return }
        Task { await insert(trimmed, user: user) }
    }

    func toggleLike(id: UUID) {
        if DevelopmentData.isActive {
            guard let index = posts.firstIndex(where: { $0.id == id }) else { return }
            let liked = !posts[index].isLiked
            posts[index].likedByMe = liked
            posts[index].storedLikeCount = liked ? 1 : 0
            DevelopmentData.save(posts: posts)
            return
        }
        guard let userId = currentUserId else {
            likeError = "いいねするにはAppleかGoogleでログインしてください。"
            return
        }
        guard !pendingLikes.contains(id),
              let post = posts.first(where: { $0.id == id }) else { return }
        pendingLikes.insert(id)
        Task {
            defer { pendingLikes.remove(id) }
            do {
                let stats: [PostLikeStats] = try await IrukaDatabase.client
                    .rpc("set_post_like", params: SetLikeParams(
                        target_post_id: id, liked: !post.isLiked, expected_user_id: userId
                    ))
                    .execute().value
                guard currentUserId == userId,
                      let stat = stats.first,
                      let index = posts.firstIndex(where: { $0.id == id }) else { return }
                posts[index].likedByMe = stat.isLiked
                posts[index].storedLikeCount = stat.likeCount
                likeError = nil
            } catch {
                if currentUserId == userId {
                    likeError = "いいねを保存できませんでした。もう一度試してください。"
                }
            }
        }
    }

    func refresh(userId: String?) async {
        currentUserId = userId
        likeError = nil
        if DevelopmentData.isActive { posts = DevelopmentData.timeline().filter { RelationshipStore.shared.canView($0.userId) }; return }
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .rpc("get_visible_posts", params: VisiblePostsParams(expected_user_id: userId))
                .execute()
                .value
            var stats: [PostLikeStats] = []
            if !rows.isEmpty {
                stats = try await IrukaDatabase.client
                    .rpc("get_post_likes", params: LikeStatsParams(post_ids: rows.map(\.id)))
                    .execute().value
            }
            let profiles = try await ProfileService.fetch(ids: rows.compactMap(\.userId))
            guard currentUserId == userId else { return }
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            let likes = Dictionary(uniqueKeysWithValues: stats.map { ($0.postId, $0) })
            posts = rows.map { row in
                let profile = row.userId.flatMap { profileById[$0] }
                var post = Post(
                    id: row.id,
                    authorName: profile?.name ?? row.authorName,
                    handle: profile?.handle.map { "@" + $0 } ?? row.handle,
                    initial: profile.map { String($0.name.prefix(1)) } ?? row.initial,
                    body: row.body,
                    createdAt: row.createdAt,
                    isMine: userId != nil && row.userId == userId,
                    avatarIndex: row.avatarIndex,
                    userId: row.userId,
                    parentId: row.parentId,
                    avatarUrl: profile?.avatarUrl
                )
                if let like = likes[row.id] {
                    post.likedByMe = userId != nil && like.isLiked
                    post.storedLikeCount = like.likeCount
                }
                return post
            }
        } catch {
            guard currentUserId == userId else { return }
            likeError = "投稿またはいいねを読み込めませんでした。"
        }
    }

    func syncProfile(_ user: AuthManager.User) async {
        try? await ProfileService.ensure(user)
    }

    private func insert(_ body: String, user: AuthManager.User) async {
        if user.id == DevelopmentData.userId && !DevelopmentData.isActive { return }
        if DevelopmentData.isActive {
            let profile = DevelopmentData.profile()
            let post = Post(id: UUID(), authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                            initial: String(profile.name.prefix(1)), body: body, createdAt: Date(),
                            isMine: true, avatarIndex: 0, userId: DevelopmentData.userId, avatarUrl: profile.avatarUrl)
            posts.insert(post, at: 0)
            DevelopmentData.save(posts: posts)
            return
        }
        await syncProfile(user)
        do {
            let _: [PostRow] = try await IrukaDatabase.client
                .rpc("create_post", params: CreatePostParams(
                    post_id: UUID(), post_body: body, expected_user_id: user.id
                )).execute().value
            await refresh(userId: user.id)
        } catch {
            return
        }
    }

    func createReply(body: String, parentId: UUID, replyId: UUID, user: AuthManager.User) async throws {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.unicodeScalars.count <= PostLimits.maxCharacters else {
            throw NSError(domain: "Reply", code: 1)
        }
        if DevelopmentData.isActive {
            guard user.id == DevelopmentData.userId, posts.contains(where: { $0.id == parentId }) else {
                throw NSError(domain: "Reply", code: 2)
            }
            if posts.contains(where: { $0.id == replyId }) { return }
            let profile = DevelopmentData.profile()
            let post = Post(id: replyId, authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                initial: String(profile.name.prefix(1)), body: trimmed, createdAt: Date(), isMine: true,
                avatarIndex: 0, userId: user.id, parentId: parentId)
            posts.insert(post, at: 0); DevelopmentData.save(posts: posts); return
        }
        await syncProfile(user)
        let rows: [PostRow] = try await IrukaDatabase.client.rpc("create_reply", params: CreateReplyParams(
            reply_id: replyId, target_post_id: parentId, reply_body: trimmed, expected_user_id: user.id
        )).execute().value
        guard currentUserId == user.id, let row = rows.first else { throw CancellationError() }
        let post = Post(id: row.id, authorName: row.authorName, handle: row.handle, initial: row.initial,
            body: row.body, createdAt: row.createdAt, isMine: true, avatarIndex: row.avatarIndex,
            userId: row.userId, parentId: row.parentId)
        posts.removeAll { $0.id == post.id }; posts.insert(post, at: 0)
    }

}
