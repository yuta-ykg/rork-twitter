import Foundation
import Observation

@MainActor
@Observable
final class BookmarkStore {
    private(set) var ids: [UUID] = []
    private var userId: String?
    private var storageKey: String?
    var error: String?

    func configure(userId: String?) {
        let key = userId.map { "iruka:bookmarks:\(DevelopmentData.isActive ? "development" : "account"):\($0)" }
        guard key != storageKey else { return }
        self.userId = userId
        storageKey = key
        error = nil
        ids = key.flatMap { UserDefaults.standard.stringArray(forKey: $0) }?
            .compactMap { UUID(uuidString: $0) } ?? []
        var seen = Set<UUID>()
        ids = ids.filter { seen.insert($0).inserted }
    }

    func contains(_ id: UUID, userId: String?) -> Bool {
        userId != nil && self.userId == userId && ids.contains(id)
    }

    func toggle(_ id: UUID, userId: String?) {
        guard let userId else {
            error = "ブックマークするにはログインしてください。"
            return
        }
        configure(userId: userId)
        guard let key = storageKey else { return }
        if ids.contains(id) { ids.removeAll { $0 == id } }
        else { ids.insert(id, at: 0) }
        UserDefaults.standard.set(ids.map(\.uuidString), forKey: key)
        error = nil
    }
}
