import Foundation
import Observation
import Supabase

nonisolated struct ListMember: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let handle: String?
}
nonisolated struct UserList: Codable, Identifiable, Sendable {
    let id: UUID
    var name: String
    var description: String
    var members: [ListMember]
    var isPublic: Bool? = nil
    var ownerId: String? = nil
    enum CodingKeys: String, CodingKey {
        case id, name, description, members
        case isPublic = "is_public", ownerId = "owner_id"
    }
}
nonisolated struct PublicListSnapshot: Decodable, Sendable {
    let list: UserList
    let posts: [PostRow]
}
nonisolated struct PublicListIDParams: Encodable, Sendable { let target_list_id: UUID }
nonisolated struct PublicListSearchParams: Encodable, Sendable { let keyword: String }

@MainActor
enum PublicListService {
    static func fetch(_ id: UUID) async throws -> PublicListSnapshot? {
        try await IrukaDatabase.client.rpc("get_public_user_list", params: PublicListIDParams(target_list_id: id)).execute().value
    }
    static func find(_ keyword: String) async throws -> [UserList] {
        try await IrukaDatabase.client.rpc("find_public_user_lists", params: PublicListSearchParams(keyword: keyword)).execute().value
    }
    static func shareURL(_ id: UUID) -> URL? {
        guard let base = Bundle.main.object(forInfoDictionaryKey: "PublicWebURL") as? String,
              let url = URL(string: base), url.scheme == "https", url.host != nil else { return nil }
        return URL(string: "/public/lists/\(id.uuidString.lowercased())", relativeTo: url)?.absoluteURL
    }
}
nonisolated struct ManageListsParams: Encodable, Sendable {
    let expected_user_id: String
    let operation: String
    let target_list_id: UUID?
    let list_name: String
    let list_description: String
    let target_user_id: String?
}
nonisolated struct SearchListProfilesParams: Encodable, Sendable {
    let expected_user_id: String
    let keyword: String
}

@MainActor @Observable
final class UserListStore {
    private(set) var lists: [UserList] = []
    private(set) var busy = false
    private(set) var loading = false
    var error: String?
    private var userId: String?
    private var generation = 0
    private var key: String { "iruka-lists:\(userId ?? "")" }

    func configure(userId: String?) {
        guard self.userId != userId else { return }
        generation += 1
        self.userId = userId
        lists = []; busy = false; loading = false; error = nil
    }
    func refresh() async { _ = await perform("read") }

    @discardableResult
    func perform(_ operation: String, id: UUID? = nil, name: String = "", description: String = "", member: ListMember? = nil) async -> Bool {
        guard let userId, !busy else { return false }
        if DevelopmentData.isActive && (operation == "publish" || operation == "unpublish") {
            error = "公開するにはAppleかGoogleでログインしてください。"
            return false
        }
        let epoch = generation
        let local = DevelopmentData.isActive
        busy = true; loading = operation == "read"; error = nil
        defer { if generation == epoch { busy = false; loading = false } }
        do {
            if operation == "create" || operation == "update" {
                guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                      name.trimmingCharacters(in: .whitespacesAndNewlines).unicodeScalars.count <= 40,
                      description.unicodeScalars.count <= 160 else {
                    throw NSError(domain: "Lists", code: 1)
                }
            }
            let target = operation == "create" ? UUID() : id
            let next: [UserList]
            if local {
                guard userId == DevelopmentData.userId else { throw NSError(domain: "Lists", code: 2) }
                var rows: [UserList] = []
                if let data = UserDefaults.standard.data(forKey: key) { rows = try JSONDecoder().decode([UserList].self, from: data) }
                if operation == "create", let target {
                    rows.insert(UserList(id: target, name: name.trimmingCharacters(in: .whitespacesAndNewlines), description: description, members: []), at: 0)
                } else if operation != "read" {
                    guard let index = rows.firstIndex(where: { $0.id == target }) else { throw NSError(domain: "Lists", code: 3) }
                    switch operation {
                    case "update": rows[index].name = name.trimmingCharacters(in: .whitespacesAndNewlines); rows[index].description = description
                    case "delete": rows.remove(at: index)
                    case "add":
                        if let member, !rows[index].members.contains(where: { $0.id == member.id }) { rows[index].members.append(member) }
                    case "remove": rows[index].members.removeAll { $0.id == member?.id }
                    default: throw NSError(domain: "Lists", code: 4)
                    }
                }
                if operation != "read" { UserDefaults.standard.set(try JSONEncoder().encode(rows), forKey: key) }
                next = rows
            } else {
                next = try await IrukaDatabase.client.rpc("manage_user_lists", params: ManageListsParams(
                    expected_user_id: userId, operation: operation, target_list_id: target,
                    list_name: name, list_description: description, target_user_id: member?.id
                )).execute().value
            }
            guard generation == epoch else { return false }
            lists = next
            return true
        } catch {
            if generation == epoch { self.error = "リストを保存・読み込みできませんでした。" }
            return false
        }
    }
    func search(_ keyword: String) async throws -> [ListMember] {
        guard let userId, !keyword.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        if DevelopmentData.isActive {
            let profile = DevelopmentData.profile()
            let query = keyword.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "@", with: "").lowercased()
            return "\(profile.name) \(profile.handle ?? "")".lowercased().contains(query)
                ? [ListMember(id: profile.id, name: profile.name, handle: profile.handle)] : []
        }
        return try await IrukaDatabase.client.rpc("search_list_profiles", params: SearchListProfilesParams(expected_user_id: userId, keyword: keyword)).execute().value
    }
}
