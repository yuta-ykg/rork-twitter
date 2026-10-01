import Foundation
import PostgREST
import Supabase

enum IrukaDatabase {
    static let client = SupabaseClient(
        supabaseURL: URL(string: Config.EXPO_PUBLIC_SUPABASE_URL)!,
        supabaseKey: Config.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        options: .init(
            auth: .init(accessToken: {
                KeychainHelper.get("access_token")
            })
        )
    )
}

nonisolated struct PostRow: Codable, Sendable {
    let id: UUID
    let authorName: String
    let handle: String
    let initial: String
    let body: String
    let createdAt: Date
    let avatarIndex: Int
    let userId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case authorName = "author_name"
        case handle
        case initial
        case body
        case createdAt = "created_at"
        case avatarIndex = "avatar_index"
        case userId = "user_id"
    }
}

nonisolated struct PostInsert: Encodable, Sendable {
    let authorName: String
    let handle: String
    let initial: String
    let body: String
    let isMine: Bool
    let avatarIndex: Int
    let userId: String

    enum CodingKeys: String, CodingKey {
        case authorName = "author_name"
        case handle
        case initial
        case body
        case isMine = "is_mine"
        case avatarIndex = "avatar_index"
        case userId = "user_id"
    }
}

nonisolated struct ProfileUpsert: Encodable, Sendable {
    let id: String
    let email: String
    let name: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case avatarUrl = "avatar_url"
    }
}
