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

@MainActor
enum ProfileService {
    static func fetch(ids: [String]) async throws -> [IrukaProfile] {
        if DevelopmentData.isActive { return ids.contains(DevelopmentData.userId) ? [DevelopmentData.profile()] : [] }
        guard !ids.isEmpty else { return [] }
        return try await IrukaDatabase.client
            .rpc("get_public_profiles", params: ProfileIDs(profile_ids: Array(Set(ids))))
            .execute().value
    }

    static func ensure(_ user: AuthManager.User) async throws {
        if DevelopmentData.isActive { return }
        try await IrukaDatabase.client.rpc("ensure_profile", params: [
            "expected_user_id": user.id, "profile_email": user.email,
            "profile_name": user.name ?? "ユーザー", "profile_avatar": user.picture ?? ""
        ]).execute()
    }
}
