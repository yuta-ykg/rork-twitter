import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class NotificationStore {
    private(set) var items: [AppNotification] = []
    private(set) var profiles: [String: IrukaProfile] = [:]
    private(set) var isLoading = false
    private(set) var failed = false
    private(set) var isLoadingMore = false
    private(set) var hasMore = true
    private var userId: String?
    private let pageSize = 30

    nonisolated private struct PageParams: Encodable, Sendable {
        let expected_user_id: String
        let before_at: String?
        let page_size: Int
    }

    private func fetchPage(userId: String, before: Date?) async throws -> [AppNotification] {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        // マイクロ秒の丸めで取りこぼさないように1ms進め、重複は呼び出し側で除く。
        let cursor = before.map { formatter.string(from: $0.addingTimeInterval(0.001)) }
        return try await IrukaDatabase.client
            .rpc("get_notifications_page", params: PageParams(expected_user_id: userId, before_at: cursor, page_size: pageSize))
            .execute().value
    }

    private func loadProfiles(for rows: [AppNotification]) async {
        let missing = Set(rows.map(\.actorId)).filter { profiles[$0] == nil }
        guard !missing.isEmpty else { return }
        let found = (try? await ProfileService.fetch(ids: Array(missing))) ?? []
        for profile in found { profiles[profile.id] = profile }
    }

    /// 末尾近くに来たとき、さらに古い通知を読み込む。
    func loadMore() async {
        guard let userId, hasMore, !isLoadingMore, let last = items.last else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        guard let rows = try? await fetchPage(userId: userId, before: last.createdAt) else { return }
        guard self.userId == userId else { return }
        let known = Set(items.map(\.id))
        let fresh = rows.filter { !known.contains($0.id) }
        await loadProfiles(for: fresh)
        items += fresh
        hasMore = rows.count >= pageSize
    }

    var hasUnread: Bool { items.contains(where: \.isNew) }

    func refresh(userId: String?) async {
        self.userId = userId
        guard let userId else { items = []; return }
        if items.isEmpty { isLoading = true }
        defer { isLoading = false }
        do {
            let rows = try await fetchPage(userId: userId, before: nil)
            let found = (try? await ProfileService.fetch(ids: rows.map(\.actorId))) ?? []
            guard self.userId == userId else { return }
            profiles = Dictionary(found.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
            items = rows
            hasMore = rows.count >= pageSize
            failed = false
        } catch {
            failed = true
        }
    }

    /// ここまでを既読にし、未読ドットを消す。
    func markRead() async {
        guard let userId, hasUnread else { return }
        do {
            try await IrukaDatabase.client
                .rpc("mark_notifications_read", params: ExpectedUserParams(expected_user_id: userId))
                .execute()
            items = items.map {
                AppNotification(kind: $0.kind, actorId: $0.actorId, postId: $0.postId, refPostId: $0.refPostId,
                                body: $0.body, createdAt: $0.createdAt, isNew: false)
            }
        } catch {
            return
        }
    }
}
