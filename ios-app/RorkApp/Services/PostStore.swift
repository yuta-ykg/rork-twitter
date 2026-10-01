import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    private let likesKey = "iruka-likes"
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
        guard let index = posts.firstIndex(where: { $0.id == id }) else { return }
        let wasLiked = posts[index].isLiked
        posts[index].storedLikeCount = max(0, posts[index].likeCount + (wasLiked ? -1 : 1))
        posts[index].likedByMe = !wasLiked
        saveLikes()
    }

    func refresh(userId: String?) async {
        currentUserId = userId
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .from("posts")
                .select("id, author_name, handle, initial, body, created_at, avatar_index, user_id")
                .order("created_at", ascending: false)
                .execute()
                .value
            let likes = likeMap()
            posts = rows.map { row in
                var post = Post(
                    id: row.id,
                    authorName: row.authorName,
                    handle: row.handle,
                    initial: row.initial,
                    body: row.body,
                    createdAt: row.createdAt,
                    isMine: userId != nil && row.userId == userId,
                    avatarIndex: row.avatarIndex,
                    userId: row.userId
                )
                if let like = likes[row.id.uuidString] {
                    post.likedByMe = like.liked
                    post.storedLikeCount = like.count
                }
                return post
            }
        } catch {
            posts = []
        }
    }

    func syncProfile(_ user: AuthManager.User) async {
        let payload = ProfileUpsert(id: user.id, email: user.email, name: user.name, avatarUrl: user.picture)
        try? await IrukaDatabase.client.from("profiles").upsert(payload).execute()
    }

    private func insert(_ body: String, user: AuthManager.User) async {
        await syncProfile(user)
        let payload = PostInsert(
            authorName: String(user.displayName.prefix(40)),
            handle: String(user.handle.prefix(40)),
            initial: user.initial,
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

    private struct LikeRecord: Codable {
        var liked: Bool
        var count: Int
    }

    private func likeMap() -> [String: LikeRecord] {
        guard let data = UserDefaults.standard.data(forKey: likesKey),
              let decoded = try? JSONDecoder().decode([String: LikeRecord].self, from: data) else {
            return [:]
        }
        return decoded
    }

    private func saveLikes() {
        var map = likeMap()
        for post in posts {
            map[post.id.uuidString] = LikeRecord(liked: post.isLiked, count: post.likeCount)
        }
        if let data = try? JSONEncoder().encode(map) {
            UserDefaults.standard.set(data, forKey: likesKey)
        }
    }
}
