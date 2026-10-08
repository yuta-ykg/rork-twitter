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
    let parentId: UUID?
    let imageUrl: String?
    var quoteOf: UUID? = nil
    var replyTo: UUID? = nil

    enum CodingKeys: String, CodingKey {
        case quoteOf = "quote_of"
        case replyTo = "reply_to"
        case id
        case authorName = "author_name"
        case handle
        case initial
        case body
        case createdAt = "created_at"
        case avatarIndex = "avatar_index"
        case userId = "user_id"
        case parentId = "parent_id"
        case imageUrl = "image_url"
    }
}

nonisolated struct LikeRow: Codable, Sendable {
    let postId: UUID
    let likeCount: Int
    let isLiked: Bool

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case likeCount = "like_count"
        case isLiked = "is_liked"
    }
}

nonisolated struct PostLikesParams: Encodable, Sendable {
    let post_ids: [UUID]
}

nonisolated struct SetLikeParams: Encodable, Sendable {
    let target_post_id: UUID
    let liked: Bool
    let expected_user_id: String
}

nonisolated struct RepostRow: Codable, Sendable {
    let postId: UUID
    let repostCount: Int
    let isReposted: Bool

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case repostCount = "repost_count"
        case isReposted = "is_reposted"
    }
}

nonisolated struct SetRepostParams: Encodable, Sendable {
    let target_post_id: UUID
    let reposted: Bool
    let expected_user_id: String
}

nonisolated struct CreateQuoteParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let quote_of_id: UUID
    let expected_user_id: String
    var post_image_url: String? = nil
}

nonisolated struct CreateReplyParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let reply_to_id: UUID
    let expected_user_id: String
    var post_image_url: String? = nil
}

nonisolated struct VisiblePostsParams: Encodable, Sendable {
    let expected_user_id: String?
}

nonisolated struct CreatePostParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let expected_user_id: String
    var post_image_url: String? = nil
}
