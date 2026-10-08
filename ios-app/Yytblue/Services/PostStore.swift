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
    private var currentUserId: String?

    var timeline: [Post] {
        posts.sorted { $0.createdAt > $1.createdAt }
    }

    var mine: [Post] {
        timeline.filter(\.isMine)
    }

    func add(body: String, image: Data?, user: AuthManager.User) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters else { return }
        Task { await insert(trimmed, image: image, user: user) }
    }

    /// 選んだ画像を長辺1600px以内のJPEGに縮める。
    nonisolated static func compressedJPEG(from data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, 1600 / max(longest, 1))
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
        if DevelopmentData.isActive {
            posts = DevelopmentData.timeline()
            return
        }
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
            guard currentUserId == userId else { return }
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            posts = rows.map { row in
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
                    isLiked: likeById[row.id]?.isLiked ?? false
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
        if DevelopmentData.isActive {
            DevelopmentData.save(posts: posts)
            return
        }
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

    func syncProfile(_ user: AuthManager.User) async {
        try? await ProfileService.ensure(user)
    }

    private func insert(_ body: String, image: Data?, user: AuthManager.User) async {
        if user.id == DevelopmentData.userId && !DevelopmentData.isActive { return }
        if DevelopmentData.isActive {
            let profile = DevelopmentData.profile()
            let post = Post(
                id: UUID(), authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                initial: String(profile.name.prefix(1)), body: body, createdAt: Date(),
                isMine: true, avatarIndex: 0, userId: DevelopmentData.userId, avatarUrl: profile.avatarUrl,
                imageUrl: image.map { "data:image/jpeg;base64," + $0.base64EncodedString() }
            )
            posts.insert(post, at: 0)
            DevelopmentData.save(posts: posts)
            return
        }
        await syncProfile(user)
        do {
            var imageUrl: String?
            if let image {
                let path = "\(user.id)/\(UUID().uuidString).jpg"
                let bucket = IrukaDatabase.client.storage.from("post-images")
                try await bucket.upload(path, data: image, options: FileOptions(contentType: "image/jpeg"))
                imageUrl = try bucket.getPublicURL(path: path).absoluteString
            }
            let _: [PostRow] = try await IrukaDatabase.client
                .rpc("create_post", params: CreatePostParams(
                    post_id: UUID(), post_body: body, expected_user_id: user.id, post_image_url: imageUrl
                )).execute().value
            await refresh(userId: user.id)
        } catch {
            guard currentUserId == user.id else { return }
            composeError = "投稿できませんでした。もう一度試してください。"
        }
    }
}
