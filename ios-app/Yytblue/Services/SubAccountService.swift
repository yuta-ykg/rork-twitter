import Foundation
import Supabase

nonisolated struct SubAccount: Codable, Identifiable, Sendable, Equatable {
    let id: String
    let name: String
    let handle: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, name, handle
        case avatarUrl = "avatar_url"
    }
}

nonisolated struct CreateSubParams: Encodable, Sendable {
    let sub_name: String
    let sub_handle: String
}

nonisolated struct DeleteSubParams: Encodable, Sendable {
    let sub_id: String
}

/// サブアカウント（最大5つ）の取得・作成・削除。
@MainActor
enum SubAccountService {
    static let maxCount = 5

    static func list() async throws -> [SubAccount] {
        try await IrukaDatabase.client.rpc("list_sub_accounts").execute().value
    }

    static func create(name: String, handle: String) async throws -> SubAccount {
        let rows: [SubAccount] = try await IrukaDatabase.client
            .rpc("create_sub_account", params: CreateSubParams(sub_name: name, sub_handle: handle))
            .execute().value
        guard let row = rows.first else { throw URLError(.badServerResponse) }
        return row
    }

    static func delete(id: String) async throws {
        try await IrukaDatabase.client.rpc("delete_sub_account", params: DeleteSubParams(sub_id: id)).execute()
    }
}
