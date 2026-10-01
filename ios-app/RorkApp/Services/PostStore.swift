import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    private let mineKey = "iruka-mine-ids"
    private let likesKey = "iruka-likes"

    init() {
        Task { await refresh() }
    }

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

    func add(body: String) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters else { return }
        Task { await insert(trimmed) }
    }

    func toggleLike(id: UUID) {
        guard let index = posts.firstIndex(where: { $0.id == id }) else { return }
        let wasLiked = posts[index].isLiked
        posts[index].storedLikeCount = max(0, posts[index].likeCount + (wasLiked ? -1 : 1))
        posts[index].likedByMe = !wasLiked
        saveLikes()
    }

    func refresh() async {
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .from("posts")
                .select("id, author_name, handle, initial, body, created_at, avatar_index")
                .order("created_at", ascending: false)
                .execute()
                .value
            let mine = mineIDs()
            let likes = likeMap()
            posts = rows.map { row in
                var post = Post(
                    id: row.id,
                    authorName: row.authorName,
                    handle: row.handle,
                    initial: row.initial,
                    body: row.body,
                    createdAt: row.createdAt,
                    isMine: mine.contains(row.id),
                    avatarIndex: row.avatarIndex
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

    private func insert(_ body: String) async {
        let payload = PostInsert(
            authorName: "あなた",
            handle: "@you",
            initial: "あ",
            body: body,
            isMine: false,
            avatarIndex: 0
        )
        do {
            let row: PostRow = try await IrukaDatabase.client
                .from("posts")
                .insert(payload)
                .select("id, author_name, handle, initial, body, created_at, avatar_index")
                .single()
                .execute()
                .value
            var ids = mineIDs()
            ids.insert(row.id)
            UserDefaults.standard.set(ids.map(\.uuidString), forKey: mineKey)
            await refresh()
        } catch {
            return
        }
    }

    private func mineIDs() -> Set<UUID> {
        let raw = UserDefaults.standard.stringArray(forKey: mineKey) ?? []
        return Set(raw.compactMap(UUID.init(uuidString:)))
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
