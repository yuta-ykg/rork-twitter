import Foundation
import Observation

nonisolated struct RelationshipRow: Decodable, Sendable {
    let targetId: String
    let kind: String
    let targetName: String
    let targetHandle: String?
    enum CodingKeys: String, CodingKey {
        case targetId = "target_id", kind
        case targetName = "target_name", targetHandle = "target_handle"
    }
}
nonisolated struct RelationshipIdentityParams: Encodable, Sendable {
    let expected_user_id: String
}
nonisolated struct SetRelationshipParams: Encodable, Sendable {
    let target_user_id: String
    let relation_kind: String
    let active: Bool
    let expected_user_id: String
}
nonisolated struct VisiblePostsParams: Encodable, Sendable {
    let expected_user_id: String?
}
nonisolated struct CreatePostParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let expected_user_id: String
}

@MainActor
@Observable
final class RelationshipStore {
    static let shared = RelationshipStore()
    private(set) var rows: [RelationshipRow] = []
    private(set) var userId: String?
    var error: String?

    func configure(userId: String?) {
        guard self.userId != userId else { return }
        self.userId = userId
        rows = []
        error = nil
    }

    func isMuted(_ targetId: String) -> Bool {
        rows.contains { $0.targetId == targetId && $0.kind == "mute" }
    }
    func isBlocked(_ targetId: String) -> Bool {
        rows.contains { $0.targetId == targetId && $0.kind == "block" }
    }
    func canView(_ targetId: String?) -> Bool {
        guard let targetId else { return true }
        return !isMuted(targetId) && !isBlocked(targetId)
    }

    func refresh() async {
        guard let userId else { rows = []; return }
        if DevelopmentData.isActive {
            rows = localRows(userId)
            return
        }
        do {
            let fetched: [RelationshipRow] = try await IrukaDatabase.client
                .rpc("list_user_relationships", params: RelationshipIdentityParams(expected_user_id: userId))
                .execute().value
            guard self.userId == userId else { return }
            rows = fetched
            error = nil
        } catch {
            guard self.userId == userId else { return }
            self.error = "設定を読み込めませんでした。"
        }
    }

    func set(targetId: String, kind: String, active: Bool) async throws {
        guard let userId, targetId != userId, kind == "mute" || kind == "block" else {
            throw NSError(domain: "Relationship", code: 1)
        }
        if DevelopmentData.isActive {
            var saved = localRows(userId)
            saved.removeAll { $0.targetId == targetId && $0.kind == kind }
            if active {
                saved.append(RelationshipRow(targetId: targetId, kind: kind, targetName: targetId, targetHandle: nil))
            }
            UserDefaults.standard.set(saved.map { ["target_id": $0.targetId, "kind": $0.kind, "target_name": $0.targetName] },
                                      forKey: "iruka-relationships-" + userId)
            rows = saved
            return
        }
        let _: [RelationshipState] = try await IrukaDatabase.client
            .rpc("set_user_relationship", params: SetRelationshipParams(
                target_user_id: targetId, relation_kind: kind, active: active, expected_user_id: userId
            )).execute().value
        await refresh()
    }

    private func localRows(_ userId: String) -> [RelationshipRow] {
        (UserDefaults.standard.array(forKey: "iruka-relationships-" + userId) as? [[String: String]] ?? [])
            .compactMap { entry in
                guard let id = entry["target_id"], let kind = entry["kind"] else { return nil }
                return RelationshipRow(targetId: id, kind: kind,
                                       targetName: entry["target_name"] ?? id, targetHandle: nil)
            }
    }
}
nonisolated struct RelationshipState: Decodable, Sendable {
    let isMuted: Bool
    let isBlocked: Bool
    enum CodingKeys: String, CodingKey { case isMuted = "is_muted", isBlocked = "is_blocked" }
}
