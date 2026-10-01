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
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .from("posts")
                .select("id, author_name, handle, initial, body, created_at, avatar_index, user_id")
                .order("created_at", ascending: false)
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
        await syncProfile(user)
        let profile = try? await ProfileService.fetch(ids: [user.id]).first
        let payload = PostInsert(
            authorName: profile?.name ?? String(user.displayName.prefix(40)),
            handle: profile?.handle.map { "@" + $0 } ?? String(user.handle.prefix(40)),
            initial: profile.map { String($0.name.prefix(1)) } ?? user.initial,
            body: body,
            isMine: true,
            avatarIndex: 0,
            userId: user.id
        )
        do {
            let _: PostRow = try await IrukaDatabase.client
                .from("posts")
                .insert(payload)
                .select("id, author_name, handle, initial, body, created_at, avatar_index, user_id")
                .single()
                .execute()
                .value
            await refresh(userId: user.id)
        } catch {
            return
        }
    }

}
