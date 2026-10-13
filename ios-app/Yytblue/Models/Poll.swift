import Foundation

/// 投稿に付く投票。1アカウント1回だけ投票でき、期限が来ると結果だけになる。
nonisolated struct Poll: Codable, Hashable, Sendable {
    let options: [String]
    var counts: [Int]
    let endsAt: Date
    var myVote: Int?

    var totalVotes: Int { counts.reduce(0, +) }
    var isClosed: Bool { endsAt <= Date() }

    static let maxOptions = 4
    static let maxOptionCharacters = 25
}

/// 投稿画面で組み立てる投票の下書き。
nonisolated struct PollDraft: Sendable {
    let options: [String]
    let durationMinutes: Int
}

nonisolated struct PollRow: Decodable, Sendable {
    let postId: UUID
    let options: [String]
    let counts: [Int]
    let endsAt: Date
    let myVote: Int?

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case options, counts
        case endsAt = "ends_at"
        case myVote = "my_vote"
    }

    var poll: Poll { Poll(options: options, counts: counts, endsAt: endsAt, myVote: myVote) }
}

nonisolated struct GetPollsParams: Encodable, Sendable {
    let post_ids: [UUID]
    let expected_user_id: String?
}

nonisolated struct CreatePollParams: Encodable, Sendable {
    let target_post_id: UUID
    let poll_options: [String]
    let duration_minutes: Int
    let expected_user_id: String
}

nonisolated struct VotePollParams: Encodable, Sendable {
    let target_post_id: UUID
    let option_index: Int
    let expected_user_id: String
}
