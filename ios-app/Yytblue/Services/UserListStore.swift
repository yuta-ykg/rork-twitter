import Foundation
import Observation
import Supabase

nonisolated struct UserListRow: Decodable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let memberCount: Int
    let createdAt: Date
    enum CodingKeys: String, CodingKey { case id, name, memberCount = "member_count", createdAt = "created_at" }
}
nonisolated struct ListMemberRow: Decodable, Identifiable, Sendable {
    var id: String { targetId }
    let targetId: String
    let targetName: String?
    let targetHandle: String?
    let isBlocked: Bool
    enum CodingKeys: String, CodingKey {
        case targetId = "target_id", targetName = "target_name", targetHandle = "target_handle", isBlocked = "is_blocked"
    }
}
nonisolated struct ListAccountRow: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let handle: String?
}
nonisolated struct ListIdentityParams: Encodable, Sendable { let expected_user_id: String }
nonisolated struct CreateListParams: Encodable, Sendable {
    let target_list_id: UUID
    let list_name: String
    let expected_user_id: String
}
nonisolated struct RenameListParams: Encodable, Sendable {
    let target_list_id: UUID
    let list_name: String
    let expected_user_id: String
}
nonisolated struct DeleteListParams: Encodable, Sendable {
    let target_list_id: UUID
    let expected_user_id: String
}
nonisolated struct ListMemberParams: Encodable, Sendable {
    let target_list_id: UUID
    let target_user_id: String
    let included: Bool
    let expected_user_id: String
}
nonisolated struct GetListParams: Encodable, Sendable {
    let target_list_id: UUID
    let expected_user_id: String
}
nonisolated struct SearchListParams: Encodable, Sendable {
    let search_query: String
    let expected_user_id: String
}
nonisolated struct ListPostsParams: Encodable, Sendable {
    let target_list_id: UUID
    let expected_user_id: String
}
private struct LocalUserList: Codable, Identifiable {
    var id: UUID
    var name: String
    var members: [String]
    var createdAt: Date
}

@MainActor
@Observable
final class UserListStore {
    static let shared = UserListStore()
    private(set) var lists: [UserListRow] = []
    private(set) var userId: String?
    var error: String?
    private func key(_ userId: String) -> String { "iruka-user-lists-" + userId }
    func configure(userId: String?) {
        guard self.userId != userId else { return }
        self.userId = userId; lists = []; error = nil
    }
    func refresh() async {
        guard let userId else { lists = []; return }
        if DevelopmentData.isActive {
            lists = localLists(userId).map { UserListRow(id: $0.id, name: $0.name, memberCount: $0.members.count, createdAt: $0.createdAt) }
            return
        }
        do {
            let next: [UserListRow] = try await IrukaDatabase.client
                .rpc("get_user_lists", params: ListIdentityParams(expected_user_id: userId)).execute().value
            guard self.userId == userId else { return }
            lists = next; error = nil
        } catch { if self.userId == userId { self.error = "リストを読み込めませんでした。" } }
    }
    func create(id: UUID, name rawName: String) async throws {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        let name = try validName(rawName)
        if DevelopmentData.isActive {
            var rows = localLists(userId)
            if let old = rows.first(where: { $0.id == id }) {
                guard old.name == name else { throw NSError(domain: "UserList", code: 2) }
            } else { rows.insert(LocalUserList(id: id, name: name, members: [], createdAt: Date()), at: 0); save(rows, userId) }
        } else {
            try await IrukaDatabase.client.rpc("create_user_list", params: CreateListParams(target_list_id: id, list_name: name, expected_user_id: userId)).execute()
        }
        await refresh()
    }
    func rename(id: UUID, name rawName: String) async throws {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        let name = try validName(rawName)
        if DevelopmentData.isActive {
            var rows = localLists(userId); guard let index = rows.firstIndex(where: { $0.id == id }) else { throw NSError(domain: "UserList", code: 3) }
            rows[index].name = name; save(rows, userId)
        } else {
            try await IrukaDatabase.client.rpc("rename_user_list", params: RenameListParams(target_list_id: id, list_name: name, expected_user_id: userId)).execute()
        }
        await refresh()
    }
    func delete(id: UUID) async throws {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        if DevelopmentData.isActive { save(localLists(userId).filter { $0.id != id }, userId) }
        else { try await IrukaDatabase.client.rpc("delete_user_list", params: DeleteListParams(target_list_id: id, expected_user_id: userId)).execute() }
        await refresh()
    }
    func members(id: UUID) async throws -> [ListMemberRow] {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        if DevelopmentData.isActive {
            let accounts = localAccounts()
            return try localList(id, userId).members.map { target in
                let account = accounts.first { $0.id == target }
                return ListMemberRow(targetId: target, targetName: account?.name ?? "ユーザー", targetHandle: account?.handle, isBlocked: false)
            }
        }
        return try await IrukaDatabase.client.rpc("get_user_list_members", params: GetListParams(target_list_id: id, expected_user_id: userId)).execute().value
    }
    func setMember(listId: UUID, targetId: String, included: Bool) async throws {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        if DevelopmentData.isActive {
            var rows = localLists(userId); guard let index = rows.firstIndex(where: { $0.id == listId }) else { throw NSError(domain: "UserList", code: 3) }
            if included {
                if !rows[index].members.contains(targetId) { rows[index].members.append(targetId) }
            } else { rows[index].members.removeAll { $0 == targetId } }
            save(rows, userId)
        } else {
            try await IrukaDatabase.client.rpc("set_user_list_member", params: ListMemberParams(target_list_id: listId, target_user_id: targetId, included: included, expected_user_id: userId)).execute()
        }
        await refresh()
    }
    func search(_ query: String) async throws -> [ListAccountRow] {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        if DevelopmentData.isActive {
            let needle = query.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "@", with: "").lowercased()
            return localAccounts().filter { $0.name.lowercased().contains(needle) || ($0.handle?.lowercased().contains(needle) ?? false) }
                .map { ListAccountRow(id: $0.id, name: $0.name, handle: $0.handle) }
        }
        return try await IrukaDatabase.client.rpc("search_list_accounts", params: SearchListParams(search_query: query, expected_user_id: userId)).execute().value
    }
    func posts(id: UUID) async throws -> [PostRow] {
        guard let userId else { throw NSError(domain: "UserList", code: 1) }
        if DevelopmentData.isActive {
            let ids = Set(try localList(id, userId).members)
            return DevelopmentData.timeline().filter { ids.contains($0.userId ?? "") && RelationshipStore.shared.canView($0.userId) }.map { post in
                PostRow(id: post.id, authorName: post.authorName, handle: post.handle, initial: post.initial, body: post.body, createdAt: post.createdAt, avatarIndex: post.avatarIndex, userId: post.userId, parentId: post.parentId)
            }
        }
        return try await IrukaDatabase.client.rpc("get_user_list_posts", params: ListPostsParams(target_list_id: id, expected_user_id: userId)).execute().value
    }
    private func validName(_ name: String) throws -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= 40 else { throw NSError(domain: "UserList", code: 4, userInfo: [NSLocalizedDescriptionKey: "リスト名は1〜40文字で入力してください。"]) }
        return trimmed
    }
    private func localLists(_ id: String) -> [LocalUserList] {
        guard let data = UserDefaults.standard.data(forKey: key(id)), let rows = try? JSONDecoder().decode([LocalUserList].self, from: data) else { return [] }
        return rows
    }
    private func save(_ rows: [LocalUserList], _ id: String) {
        if let data = try? JSONEncoder().encode(rows) { UserDefaults.standard.set(data, forKey: key(id)) }
    }
    private func localList(_ listId: UUID, _ userId: String) throws -> LocalUserList {
        guard let row = localLists(userId).first(where: { $0.id == listId }) else { throw NSError(domain: "UserList", code: 3) }
        return row
    }
    private func localAccounts() -> [ListAccountRow] {
        let user = DevelopmentData.user
        let profile = DevelopmentData.profile()
        var found: [String: ListAccountRow] = [:]
        for post in DevelopmentData.timeline() {
            if let id = post.userId { found[id] = ListAccountRow(id: id, name: post.authorName, handle: post.handle.replacingOccurrences(of: "@", with: "")) }
        }
        found[user.id] = ListAccountRow(id: user.id, name: profile.name, handle: profile.handle)
        return Array(found.values)
    }
}

