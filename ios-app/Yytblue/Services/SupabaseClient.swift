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

nonisolated struct PostLikeStats: Decodable, Sendable {
    let postId: UUID
    let likeCount: Int
    let isLiked: Bool
    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case likeCount = "like_count"
        case isLiked = "is_liked"
    }
}

nonisolated struct LikeStatsParams: Encodable, Sendable {
    let post_ids: [UUID]
}

nonisolated struct SetLikeParams: Encodable, Sendable {
    let target_post_id: UUID
    let liked: Bool
    let expected_user_id: String
}

nonisolated struct PostBookmarkRow: Decodable, Sendable {
    let postId: UUID
    enum CodingKeys: String, CodingKey { case postId = "post_id" }
}
nonisolated struct BookmarkIdentityParams: Encodable, Sendable {
    let expected_user_id: String
}
nonisolated struct SetBookmarkParams: Encodable, Sendable {
    let target_post_id: UUID
    let saved: Bool
    let expected_user_id: String
}
nonisolated struct ImportBookmarksParams: Encodable, Sendable {
    let post_ids: [UUID]
    let expected_user_id: String
}

nonisolated struct NotificationRow: Decodable, Identifiable, Sendable {
    let id: UUID
    let postId: UUID
    let likeCount: Int
    let postBody: String
    let createdAt: String
    let readAt: String?
    let unreadCount: Int
    var date: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt) ?? .distantPast
    }
    enum CodingKeys: String, CodingKey {
        case id
        case postId = "post_id", likeCount = "like_count", postBody = "post_body"
        case createdAt = "created_at", readAt = "read_at", unreadCount = "unread_count"
    }
}
nonisolated struct NotificationQueryParams: Encodable, Sendable {
    let expected_user_id: String
    let before_created_at: String?
    let before_id: UUID?
}
nonisolated struct NotificationReadParams: Encodable, Sendable {
    let target_post_id: UUID
    let before_time: String
    let expected_user_id: String
}
nonisolated struct NotificationReadAllParams: Encodable, Sendable {
    let before_time: String
    let expected_user_id: String
}

