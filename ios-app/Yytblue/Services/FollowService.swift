import Foundation
import Supabase

nonisolated struct FollowInfo: Decodable, Sendable {
    var isFollowing: Bool
    var followsYou: Bool
    var followerCount: Int
    var followingCount: Int

    enum CodingKeys: String, CodingKey {
        case isFollowing = "is_following"
        case followsYou = "follows_you"
        case followerCount = "follower_count"
        case followingCount = "following_count"
    }

    static let empty = FollowInfo(isFollowing: false, followsYou: false, followerCount: 0, followingCount: 0)
}

nonisolated struct SetFollowParams: Encodable, Sendable {
    let target_user_id: String
    let active: Bool
    let expected_user_id: String
}

nonisolated struct FollowInfoParams: Encodable, Sendable {
    let target_user_id: String
    let expected_user_id: String
}

nonisolated struct FollowingIdsParams: Encodable, Sendable {
    let expected_user_id: String
}

nonisolated struct FolloweeRow: Decodable, Sendable {
    let followeeId: String
    enum CodingKeys: String, CodingKey { case followeeId = "followee_id" }
}

@MainActor
enum FollowService {
    static func setFollow(targetId: String, active: Bool, userId: String) async throws {
        try await IrukaDatabase.client
            .rpc("set_follow", params: SetFollowParams(target_user_id: targetId, active: active, expected_user_id: userId))
            .execute()
    }

    static func info(targetId: String, userId: String) async throws -> FollowInfo {
        let rows: [FollowInfo] = try await IrukaDatabase.client
            .rpc("get_follow_info", params: FollowInfoParams(target_user_id: targetId, expected_user_id: userId))
            .execute()
            .value
        return rows.first ?? .empty
    }

    static func followingIds(userId: String) async throws -> [String] {
        let rows: [FolloweeRow] = try await IrukaDatabase.client
            .rpc("get_following_ids", params: FollowingIdsParams(expected_user_id: userId))
            .execute()
            .value
        return rows.map(\.followeeId)
    }
}
