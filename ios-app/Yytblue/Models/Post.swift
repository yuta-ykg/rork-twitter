import Foundation

nonisolated struct Post: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let authorName: String
    let handle: String
    let initial: String
    let body: String
    let createdAt: Date
    let isMine: Bool
    let avatarIndex: Int
    var userId: String? = nil
    var parentId: UUID? = nil
    var avatarUrl: String? = nil

    // Optional storage fields preserve decoding of posts saved before likes existed.
    var likedByMe: Bool? = nil
    var storedLikeCount: Int? = nil
    var poll: PostPoll? = nil

    var isLiked: Bool { likedByMe ?? false }
    var likeCount: Int { max(0, storedLikeCount ?? 0) }

    var characterCount: Int {
        body.count
    }
}

nonisolated enum PollKind: String, Codable, Hashable, Sendable {
    case poll
    case quiz
}

nonisolated enum PollOptionResult: String, Codable, CaseIterable, Hashable, Sendable, Identifiable {
    case correct
    case close
    case incorrect

    var id: String { rawValue }
    var message: String {
        switch self {
        case .correct: "正解"
        case .close: "惜しい"
        case .incorrect: "不正解"
        }
    }
}

nonisolated struct PostPollOption: Codable, Hashable, Sendable, Identifiable {
    let id: UUID
    let text: String
    let position: Int
    let result: PollOptionResult?
    let feedback: String?
    let voteCount: Int?
    let selected: Bool

    enum CodingKeys: String, CodingKey {
        case id, text, position, result, feedback, selected
        case voteCount = "vote_count"
    }
}

nonisolated struct PostPoll: Codable, Hashable, Sendable {
    let kind: PollKind
    let allowsMultiple: Bool
    let explanation: String?
    let responseCount: Int
    let hasResponded: Bool
    let options: [PostPollOption]

    enum CodingKeys: String, CodingKey {
        case kind = "poll_kind"
        case allowsMultiple = "allows_multiple"
        case explanation
        case responseCount = "response_count"
        case hasResponded = "has_responded"
        case options
    }

    init(kind: PollKind, allowsMultiple: Bool, explanation: String?, responseCount: Int,
         hasResponded: Bool, options: [PostPollOption]) {
        self.kind = kind
        self.allowsMultiple = allowsMultiple
        self.explanation = explanation
        self.responseCount = responseCount
        self.hasResponded = hasResponded
        self.options = options
    }
}

nonisolated struct PollDraftOption: Hashable, Sendable, Identifiable {
    let id: UUID
    var text: String
    var result: PollOptionResult
    var feedback: String

    init(id: UUID = UUID(), text: String = "", result: PollOptionResult = .incorrect, feedback: String = "") {
        self.id = id
        self.text = text
        self.result = result
        self.feedback = feedback
    }
}

nonisolated struct PollDraft: Hashable, Sendable {
    let kind: PollKind
    let allowsMultiple: Bool
    let explanation: String
    let options: [PollDraftOption]

    var isValid: Bool {
        guard (2...6).contains(options.count), explanation.count <= 280 else { return false }
        let labels = options.map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        guard labels.allSatisfy({ !$0.isEmpty && $0.count <= 60 }), Set(labels).count == labels.count,
              options.allSatisfy({ $0.feedback.trimmingCharacters(in: .whitespacesAndNewlines).count <= 60 }) else { return false }
        return kind != .quiz || options.contains(where: { $0.result == .correct })
    }

    var permitsMultipleAnswers: Bool {
        allowsMultiple || (kind == .quiz && options.filter { $0.result == .correct }.count > 1)
    }

    func makePoll() -> PostPoll {
        PostPoll(kind: kind, allowsMultiple: permitsMultipleAnswers,
                 explanation: kind == .quiz ? explanation.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil,
                 responseCount: 0, hasResponded: false,
                 options: options.enumerated().map { index, option in
            PostPollOption(id: UUID(), text: option.text.trimmingCharacters(in: .whitespacesAndNewlines), position: index,
                           result: kind == .quiz ? option.result : nil,
                           feedback: kind == .quiz ? option.feedback.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil,
                           voteCount: nil, selected: false)
        })
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}

enum PostLimits {
    static let maxCharacters = 70
}

enum AvatarPalette {
    static let fills: [String] = ["#8ECAE6", "#CDB4DB", "#F4A6A6", "#95D5B2", "#E9C46A"]
}
