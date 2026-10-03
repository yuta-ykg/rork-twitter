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

    enum CodingKeys: String, CodingKey {
        case id
        case authorName = "author_name"
        case handle
        case initial
        case body
        case createdAt = "created_at"
        case avatarIndex = "avatar_index"
        case userId = "user_id"
        case parentId = "parent_id"
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
    let actorName: String?
    let isGrouped: Bool
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
        case actorName = "actor_name", isGrouped = "is_grouped"
        case postId = "post_id", likeCount = "like_count", postBody = "post_body"
        case createdAt = "created_at", readAt = "read_at", unreadCount = "unread_count"
    }
}
nonisolated struct NotificationQueryParams: Encodable, Sendable {
    let expected_user_id: String
    let before_created_at: String?
    let before_id: UUID?
}
nonisolated struct GroupNotificationReadParams: Encodable, Sendable {
    let target_post_id: UUID
    let before_time: String
    let expected_user_id: String
}
nonisolated struct NotificationReadAllParams: Encodable, Sendable {
    let before_time: String
    let expected_user_id: String
}


nonisolated struct NotificationReadParams: Encodable, Sendable {
    let notification_ids: [UUID]
    let expected_user_id: String
}

nonisolated struct CreateReplyParams: Encodable, Sendable {
    let reply_id: UUID
    let target_post_id: UUID
    let reply_body: String
    let expected_user_id: String
}

nonisolated struct PollOptionInsert: Encodable, Sendable {
    let text: String
    let result: PollOptionResult
    let feedback: String?
}

nonisolated struct CreatePostWithPollParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let poll_kind: String
    let poll_allows_multiple: Bool
    let poll_explanation: String?
    let poll_options: [PollOptionInsert]
    let expected_user_id: String
}

nonisolated struct GetPostPollsParams: Encodable, Sendable {
    let requested_post_ids: [UUID]
    let expected_user_id: String?
}

nonisolated struct SubmitPostPollResponseParams: Encodable, Sendable {
    let target_post_id: UUID
    let option_ids: [UUID]
    let expected_user_id: String
}

nonisolated struct CreatePostWithDiagnosisParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let diagnosis_id: UUID
    let diagnosis_title: String
    let diagnosis_description: String
    let diagnosis_outcomes: [DiagnosisOutcome]
    let diagnosis_questions: [DiagnosisQuestion]
    let expected_user_id: String
}

nonisolated struct GetPostDiagnosesParams: Encodable, Sendable {
    let requested_post_ids: [UUID]
    let expected_user_id: String?
}

nonisolated struct CreateDiagnosisResultPostParams: Encodable, Sendable {
    let post_id: UUID
    let post_body: String
    let diagnosis_id: UUID
    let result_index: Int
    let expected_user_id: String
}

nonisolated struct PostDiagnosisRow: Decodable, Sendable {
    let postId: UUID
    let diagnosis: PostDiagnosis

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case diagnosis
    }
}

nonisolated struct PostPollRow: Decodable, Sendable {
    let postId: UUID
    let poll: PostPoll

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case pollKind = "poll_kind"
        case allowsMultiple = "allows_multiple"
        case explanation
        case responseCount = "response_count"
        case hasResponded = "has_responded"
        case options
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        postId = try container.decode(UUID.self, forKey: .postId)
        poll = PostPoll(
            kind: try container.decode(PollKind.self, forKey: .pollKind),
            allowsMultiple: try container.decode(Bool.self, forKey: .allowsMultiple),
            explanation: try container.decodeIfPresent(String.self, forKey: .explanation),
            responseCount: try container.decode(Int.self, forKey: .responseCount),
            hasResponded: try container.decode(Bool.self, forKey: .hasResponded),
            options: try container.decode([PostPollOption].self, forKey: .options)
        )
    }
}
