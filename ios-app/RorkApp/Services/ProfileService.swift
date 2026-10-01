import Foundation
import Supabase

nonisolated struct IrukaProfile: Decodable, Identifiable, Sendable {
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

@MainActor
enum ProfileService {
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

    static func save(id: String, name: String, handle: String, bio: String, avatar: String) async throws -> IrukaProfile {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let validHandle = handle.range(of: "^[a-z0-9_]{3,25}$", options: .regularExpression) != nil
        guard (1...40).contains(trimmed.unicodeScalars.count), validHandle,
              bio.unicodeScalars.count <= 160,
              avatar.isEmpty || (URL(string: avatar)?.scheme == "https" && avatar.count <= 2048) else {
            throw NSError(domain: "Profile", code: 1, userInfo: [NSLocalizedDescriptionKey: "表示名・ユーザー名・自己紹介・画像URLを確認してください。"])
        }
        let profiles: [IrukaProfile] = try await IrukaDatabase.client.rpc("save_profile", params: [
            "expected_user_id": id, "profile_name": trimmed, "profile_handle": handle,
            "profile_bio": bio, "profile_avatar": avatar
        ]).execute().value
        guard let profile = profiles.first else {
            throw NSError(domain: "Profile", code: 2, userInfo: [NSLocalizedDescriptionKey: "プロフィールを保存できませんでした。"])
        }
        return profile
    }
}
