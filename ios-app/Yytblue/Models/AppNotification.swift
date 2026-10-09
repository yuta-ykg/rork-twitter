import Foundation

/// 自分の投稿へのいいね・リポスト・返信・引用。
nonisolated struct AppNotification: Codable, Identifiable, Sendable {
    let kind: String
    let actorId: String
    let postId: UUID
    let refPostId: UUID?
    let body: String
    let createdAt: Date
    let isNew: Bool

    var id: String { "\(kind)-\(actorId)-\(postId)-\(createdAt.timeIntervalSince1970)" }
    /// タップで開く投稿。返信・引用は相手の投稿を開く。
    var targetId: UUID { refPostId ?? postId }

    enum CodingKeys: String, CodingKey {
        case kind, body
        case actorId = "actor_id"
        case postId = "post_id"
        case refPostId = "ref_post_id"
        case createdAt = "created_at"
        case isNew = "is_new"
    }
}

nonisolated struct ExpectedUserParams: Encodable, Sendable {
    let expected_user_id: String
}
