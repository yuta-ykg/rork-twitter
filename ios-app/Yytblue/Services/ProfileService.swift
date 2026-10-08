import Foundation
import Supabase

nonisolated struct IrukaProfile: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let handle: String?
    let bio: String
    let avatarUrl: String?
    let createdAt: Date?
    let postCount: Int
    enum CodingKeys: String, CodingKey {
        case id, name, handle, bio
        case avatarUrl = "avatar_url"
        case createdAt = "created_at"
        case postCount = "post_count"
    }
}

nonisolated struct ProfileIDs: Encodable, Sendable {
    let profile_ids: [String]
}

nonisolated struct SaveProfileParams: Encodable, Sendable {
    let expected_user_id: String
    let profile_name: String
    let profile_handle: String
    let profile_bio: String
    let profile_avatar: String
}

@MainActor
enum ProfileService {
    static let handlePattern = /^[a-z0-9_]{3,25}$/

    /// 名前・ハンドル・自己紹介を保存する。
    static func save(userId: String, name: String, handle: String, bio: String, avatar: Data? = nil) async throws -> IrukaProfile {
        var avatarUrl = ""
        if let avatar {
            let path = "\(userId)/\(UUID().uuidString).jpg"
            let bucket = IrukaDatabase.client.storage.from("avatars")
            try await bucket.upload(path, data: avatar, options: FileOptions(contentType: "image/jpeg"))
            avatarUrl = try bucket.getPublicURL(path: path).absoluteString
        }
        let rows: [IrukaProfile] = try await IrukaDatabase.client
            .rpc("save_profile", params: SaveProfileParams(
                expected_user_id: userId, profile_name: name, profile_handle: handle,
                profile_bio: bio, profile_avatar: avatarUrl))
            .execute().value
        guard let row = rows.first else { throw URLError(.badServerResponse) }
        return row
    }

    static func fetch(ids: [String]) async throws -> [IrukaProfile] {
        guard !ids.isEmpty else { return [] }
        return try await IrukaDatabase.client
            .rpc("get_public_profiles", params: ProfileIDs(profile_ids: Array(Set(ids))))
            .execute().value
    }

    static func ensure(_ user: AuthManager.User) async throws {
        try await IrukaDatabase.client.rpc("ensure_profile", params: [
            "expected_user_id": user.id, "profile_email": user.email,
            "profile_name": user.name ?? "ユーザー", "profile_avatar": user.picture ?? ""
        ]).execute()
    }
}
