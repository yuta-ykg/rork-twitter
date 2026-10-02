import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class BookmarkStore {
    private(set) var ids: [UUID] = []
    private(set) var loading = false
    private(set) var pending: Set<UUID> = []
    private var userId: String?
    private var storageKey: String?
    private var generation = 0
    private var loaded = false
    private var refreshTask: Task<Void, Never>?
    private var mutationTask: Task<Void, Never>?
    var error: String?

    func configure(userId: String?) {
        let key = userId.map { "iruka:bookmarks:\(DevelopmentData.isActive ? "development" : "account"):\($0)" }
        guard key != storageKey else { return }
        generation += 1
        refreshTask?.cancel()
        refreshTask = nil
        mutationTask = nil
        self.userId = userId
        storageKey = key
        error = nil
        pending = []
        loaded = DevelopmentData.isActive
        loading = userId != nil && !DevelopmentData.isActive
        ids = DevelopmentData.isActive ? localIds(key: key) : []
    }

    private func localIds(key: String?) -> [UUID] {
        let stored = key.flatMap { UserDefaults.standard.stringArray(forKey: $0) } ?? []
        var seen = Set<UUID>()
        return stored.compactMap { UUID(uuidString: $0) }.filter { seen.insert($0).inserted }
    }

    func contains(_ id: UUID, userId: String?) -> Bool {
        userId != nil && self.userId == userId && ids.contains(id)
    }

    func refresh() async {
        if let task = refreshTask { await task.value; return }
        guard let userId, let key = storageKey else { return }
        if DevelopmentData.isActive {
            ids = localIds(key: key); loading = false; error = nil
            return
        }
        if loaded && !pending.isEmpty { return }
        let epoch = generation
        loading = !loaded
        let task = Task { await fetch(userId: userId, key: key, epoch: epoch) }
        refreshTask = task
        await task.value
        if generation == epoch { refreshTask = nil }
    }

    private func fetch(userId: String, key: String, epoch: Int) async {
        do {
            var rows: [PostBookmarkRow] = try await IrukaDatabase.client
                .rpc("get_post_bookmarks", params: BookmarkIdentityParams(expected_user_id: userId))
                .execute().value
            guard generation == epoch && !Task.isCancelled else { return }
            let legacy = UserDefaults.standard.stringArray(forKey: key)
            let oldIds = localIds(key: key)
            var end = oldIds.count
            while end > 0 {
                let start = max(0, end - 500)
                rows = try await IrukaDatabase.client
                    .rpc("import_post_bookmarks", params: ImportBookmarksParams(
                        post_ids: Array(oldIds[start..<end]), expected_user_id: userId
                    )).execute().value
                guard generation == epoch && !Task.isCancelled else { return }
                end = start
            }
            if legacy != nil && UserDefaults.standard.stringArray(forKey: key) == legacy {
                UserDefaults.standard.removeObject(forKey: key)
            }
            ids = rows.map(\.postId)
            loaded = true
            loading = false
            error = nil
        } catch {
            guard generation == epoch else { return }
            loading = false
            self.error = "ブックマークを読み込めませんでした。"
        }
    }

    func toggle(_ id: UUID, userId: String?) {
        guard let userId else { error = "ブックマークするにはログインしてください。"; return }
        configure(userId: userId)
        guard !pending.contains(id), let key = storageKey else { return }
        if DevelopmentData.isActive {
            if ids.contains(id) { ids.removeAll { $0 == id } } else { ids.insert(id, at: 0) }
            UserDefaults.standard.set(ids.map(\.uuidString), forKey: key)
            error = nil
            return
        }
        let epoch = generation
        let previous = mutationTask
        pending.insert(id)
        mutationTask = Task {
            await previous?.value
            defer { if generation == epoch { pending.remove(id) } }
            if let task = refreshTask { await task.value }
            if !loaded { await refresh() }
            guard generation == epoch && loaded else { return }
            do {
                let rows: [PostBookmarkRow] = try await IrukaDatabase.client
                    .rpc("set_post_bookmark", params: SetBookmarkParams(
                        target_post_id: id, saved: !ids.contains(id), expected_user_id: userId
                    )).execute().value
                guard generation == epoch else { return }
                ids = rows.map(\.postId)
                error = nil
            } catch {
                if generation == epoch { self.error = "ブックマークを保存できませんでした。" }
            }
        }
    }
}
