import Foundation
import Observation
import PostgREST
import Supabase
import UIKit

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    var composeError: String?
    private(set) var followingIds: Set<String> = []
    /// アバターがタップされたユーザーID。ContentViewがプロフィールを開く。
    var profileRequest: String?
    private var currentUserId: String?
    /// 「取り消す」待ちの削除。数秒後にサーバーへ確定する。
    private(set) var pendingDelete: (post: Post, index: Int)?
    private var pendingDeleteTask: Task<Void, Never>?

    func setFollowing(_ id: String, _ following: Bool) {
        if following { followingIds.insert(id) } else { followingIds.remove(id) }
    }

    var timeline: [Post] {
        posts.sorted { $0.createdAt > $1.createdAt }
    }

    func replyCount(of post: Post) -> Int {
        posts.reduce(0) { $0 + ($1.replyTo == post.id ? 1 : 0) }
    }

    func replies(to id: UUID) -> [Post] {
        posts.filter { $0.replyTo == id }.sorted { $0.createdAt < $1.createdAt }
    }

    var mine: [Post] {
        timeline.filter(\.isMine)
    }

    func add(body: String, image: Data?, user: AuthManager.User, quoteOf: UUID? = nil, replyTo: UUID? = nil, poll: PollDraft? = nil) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters else { return }
        Task { await insert(trimmed, image: image, user: user, quoteOf: quoteOf, replyTo: replyTo, poll: poll) }
    }

    /// 選んだ画像を長辺1600px以内のJPEGに縮める。
    nonisolated static func compressedJPEG(from data: Data, maxSide: CGFloat = 1600) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, maxSide / max(longest, 1))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            UIColor.white.setFill()
            UIRectFill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        return resized.jpegData(compressionQuality: 0.85)
    }

    func refresh(userId: String?) async {
        currentUserId = userId
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .rpc("get_visible_posts", params: VisiblePostsParams(expected_user_id: userId))
                .execute()
                .value
            let profiles = (try? await ProfileService.fetch(ids: rows.compactMap(\.userId))) ?? []
            let likeRows: [LikeRow] = (try? await IrukaDatabase.client
                .rpc("get_post_likes", params: PostLikesParams(post_ids: rows.map(\.id)))
                .execute()
                .value) ?? []
            let likeById = Dictionary(likeRows.map { ($0.postId, $0) }, uniquingKeysWith: { first, _ in first })
            let repostRows: [RepostRow] = (try? await IrukaDatabase.client
                .rpc("get_post_reposts", params: PostLikesParams(post_ids: rows.map(\.id)))
                .execute()
                .value) ?? []
            let repostById = Dictionary(repostRows.map { ($0.postId, $0) }, uniquingKeysWith: { first, _ in first })
            let pollRows: [PollRow] = (try? await IrukaDatabase.client
                .rpc("get_polls", params: GetPollsParams(post_ids: rows.map(\.id), expected_user_id: userId))
                .execute()
                .value) ?? []
            let pollById = Dictionary(pollRows.map { ($0.postId, $0.poll) }, uniquingKeysWith: { first, _ in first })
            let followed: [String]? = if let userId { try? await FollowService.followingIds(userId: userId) } else { nil }
            guard currentUserId == userId else { return }
            followingIds = Set(followed ?? [])
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            let hiddenId = pendingDelete?.post.id
            posts = rows.filter { $0.id != hiddenId }.map { row in
                let profile = row.userId.flatMap { profileById[$0] }
                return Post(
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
                    avatarUrl: profile?.avatarUrl,
                    imageUrl: row.imageUrl,
                    likeCount: likeById[row.id]?.likeCount ?? 0,
                    isLiked: likeById[row.id]?.isLiked ?? false,
                    quoteOf: row.quoteOf,
                    replyTo: row.replyTo,
                    repostCount: repostById[row.id]?.repostCount ?? 0,
                    isReposted: repostById[row.id]?.isReposted ?? false,
                    poll: pollById[row.id],
                    editedAt: row.editedAt
                )
            }
        } catch {
            guard currentUserId == userId else { return }
            composeError = "投稿を読み込めませんでした。"
        }
    }

    /// いいねを付け外しする。先に画面を更新し、失敗したら元に戻す。
    func toggleLike(_ post: Post) {
        guard let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
        let original = posts[index]
        let next = !(original.isLiked ?? false)
        var updated = original
        updated.isLiked = next
        updated.likeCount = max(0, (original.likeCount ?? 0) + (next ? 1 : -1))
        posts[index] = updated
        guard let userId = currentUserId else { return }
        Task {
            do {
                let result: [LikeRow] = try await IrukaDatabase.client
                    .rpc("set_post_like", params: SetLikeParams(target_post_id: post.id, liked: next, expected_user_id: userId))
                    .execute()
                    .value
                guard let row = result.first, let i = posts.firstIndex(where: { $0.id == post.id }) else { return }
                posts[i].likeCount = row.likeCount
                posts[i].isLiked = row.isLiked
            } catch {
                if let i = posts.firstIndex(where: { $0.id == post.id }) { posts[i] = original }
            }
        }
    }

    /// 自分の投稿の本文を修正する（1〜70字）。先に画面を更新し、失敗したら元に戻す。
    func edit(_ post: Post, body: String) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        let length = trimmed.count
        guard post.isMine, length >= 1, length <= 70, currentUserId != nil else { return }
        guard let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
        let original = posts[index]
        posts[index].body = trimmed
        guard let userId = currentUserId else { return }
        Task {
            do {
                let rows: [PostRow] = try await IrukaDatabase.client
                    .rpc("edit_post", params: EditPostParams(target_post_id: post.id, new_body: trimmed, expected_user_id: userId))
                    .execute().value
                if currentUserId == userId, let row = rows.first, let i = posts.firstIndex(where: { $0.id == post.id }) {
                    posts[i].body = row.body
                    posts[i].editedAt = row.editedAt
                }
            } catch {
                if let i = posts.firstIndex(where: { $0.id == post.id }) { posts[i].body = original.body }
                composeError = "投稿を更新できませんでした。"
            }
        }
    }

    /// 自分の投稿を削除する。先に画面から外し、失敗したら元に戻す。
    func delete(_ post: Post) {
        guard post.isMine, currentUserId != nil, let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
        commitPendingDelete()
        let removed = posts.remove(at: index)
        pendingDelete = (removed, index)
        pendingDeleteTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            self?.commitPendingDelete()
        }
    }

    /// 削除を取り消して投稿を元の位置に戻す。
    func undoDelete() {
        pendingDeleteTask?.cancel()
        pendingDeleteTask = nil
        guard let pending = pendingDelete else { return }
        pendingDelete = nil
        posts.insert(pending.post, at: min(pending.index, posts.count))
    }

    /// 猛予時間を待つことなく、保留中の削除をサーバーへ確定する。
    func commitPendingDelete() {
        pendingDeleteTask?.cancel()
        pendingDeleteTask = nil
        guard let pending = pendingDelete, let userId = currentUserId else { pendingDelete = nil; return }
        pendingDelete = nil
        Task {
            do {
                try await IrukaDatabase.client
                    .rpc("delete_post", params: DeletePostParams(target_post_id: pending.post.id, expected_user_id: userId))
                    .execute()
            } catch {
                posts.insert(pending.post, at: min(pending.index, posts.count))
                composeError = "投稿を削除できませんでした。"
            }
        }
    }

    /// 投票する。1アカウント1回で、結果はサーバーの値で置き換える。
    func vote(_ post: Post, option: Int) {
        guard let userId = currentUserId, let index = posts.firstIndex(where: { $0.id == post.id }),
              posts[index].poll?.myVote == nil else { return }
        Task {
            do {
                let rows: [PollRow] = try await IrukaDatabase.client
                    .rpc("vote_poll", params: VotePollParams(target_post_id: post.id, option_index: option, expected_user_id: userId))
                    .execute()
                    .value
                guard let row = rows.first, let i = posts.firstIndex(where: { $0.id == post.id }) else { return }
                posts[i].poll = row.poll
            } catch {
                composeError = "投票できませんでした。"
            }
        }
    }

    /// リポストを付け外しする。先に画面を更新し、失敗したら元に戻す。
    func toggleRepost(_ post: Post) {
        guard let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
        let original = posts[index]
        let next = !(original.isReposted ?? false)
        posts[index].isReposted = next
        posts[index].repostCount = max(0, (original.repostCount ?? 0) + (next ? 1 : -1))
        guard let userId = currentUserId else { return }
        Task {
            do {
                let result: [RepostRow] = try await IrukaDatabase.client
                    .rpc("set_post_repost", params: SetRepostParams(target_post_id: post.id, reposted: next, expected_user_id: userId))
                    .execute()
                    .value
                guard let row = result.first, let i = posts.firstIndex(where: { $0.id == post.id }) else { return }
                posts[i].repostCount = row.repostCount
                posts[i].isReposted = row.isReposted
            } catch {
                if let i = posts.firstIndex(where: { $0.id == post.id }) { posts[i] = original }
            }
        }
    }

    /// ミュート／ブロックを付け外しし、タイムラインを読み込み直す。成功したら true。
    @discardableResult
    func setRelationship(targetId: String, kind: String, active: Bool) async -> Bool {
        guard let userId = currentUserId else { return false }
        do {
            let _: [RelationshipStateRow] = try await IrukaDatabase.client
                .rpc("set_user_relationship", params: SetRelationshipParams(
                    target_user_id: targetId, relation_kind: kind, active: active, expected_user_id: userId
                ))
                .execute()
                .value
            await refresh(userId: userId)
            return true
        } catch {
            composeError = "操作できませんでした。もう一度試してください。"
            return false
        }
    }

    func relationships() async -> [RelationshipRow] {
        guard let userId = currentUserId else { return [] }
        return (try? await IrukaDatabase.client
            .rpc("list_user_relationships", params: ListRelationshipsParams(expected_user_id: userId))
            .execute()
            .value) ?? []
    }

    /// 自分の投稿・いいね・プロフィールなどをサーバーから削除する。成功したら true。
    func deleteAccount() async -> Bool {
        guard let userId = currentUserId else { return false }
        do {
            try await IrukaDatabase.client
                .rpc("delete_account", params: DeleteAccountParams(expected_user_id: userId))
                .execute()
            return true
        } catch {
            return false
        }
    }

    func syncProfile(_ user: AuthManager.User) async {
        try? await ProfileService.ensure(user)
    }

    private func insert(_ body: String, image: Data?, user: AuthManager.User, quoteOf: UUID?, replyTo: UUID?, poll: PollDraft?) async {
        await syncProfile(user)
        do {
            var imageUrl: String?
            if let image {
                let path = "\(user.id)/\(UUID().uuidString).jpg"
                let bucket = IrukaDatabase.client.storage.from("post-images")
                try await bucket.upload(path, data: image, options: FileOptions(contentType: "image/jpeg"))
                imageUrl = try bucket.getPublicURL(path: path).absoluteString
            }
            let createdId = UUID()
            if let replyTo {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_reply_post", params: CreateReplyParams(
                        post_id: UUID(), post_body: body, reply_to_id: replyTo, expected_user_id: user.id, post_image_url: imageUrl
                    )).execute().value
            } else if let quoteOf {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_quote_post", params: CreateQuoteParams(
                        post_id: UUID(), post_body: body, quote_of_id: quoteOf, expected_user_id: user.id, post_image_url: imageUrl
                    )).execute().value
            } else {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_post", params: CreatePostParams(
                        post_id: createdId, post_body: body, expected_user_id: user.id, post_image_url: imageUrl
                    )).execute().value
            }
            if let poll {
                try await IrukaDatabase.client
                    .rpc("create_poll", params: CreatePollParams(
                        target_post_id: createdId, poll_options: poll.options, duration_minutes: poll.durationMinutes, expected_user_id: user.id
                    )).execute()
            }
            await refresh(userId: user.id)
        } catch {
            guard currentUserId == user.id else { return }
            composeError = "投稿できませんでした。もう一度試してください。"
        }
    }
}
