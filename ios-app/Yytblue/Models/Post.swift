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
    var diagnosis: PostDiagnosis? = nil

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

nonisolated struct DiagnosisOutcome: Codable, Hashable, Sendable, Identifiable {
    var id: String { title }
    let title: String
    let description: String
}

nonisolated struct DiagnosisAnswer: Codable, Hashable, Sendable, Identifiable {
    var id: String { "\(text)-\(resultIndex)" }
    let text: String
    let resultIndex: Int

    enum CodingKeys: String, CodingKey {
        case text
        case resultIndex = "result_index"
    }
}

nonisolated struct DiagnosisQuestion: Codable, Hashable, Sendable, Identifiable {
    var id: String { prompt }
    let prompt: String
    let options: [DiagnosisAnswer]
}

nonisolated struct PostDiagnosis: Codable, Hashable, Sendable {
    let id: UUID
    let creatorId: String
    let title: String
    let diagnosisDescription: String
    let outcomes: [DiagnosisOutcome]
    let questions: [DiagnosisQuestion]
    let resultIndex: Int?
    let result: DiagnosisOutcome?

    enum CodingKeys: String, CodingKey {
        case id, title, outcomes, questions, result
        case creatorId = "creator_id"
        case diagnosisDescription = "description"
        case resultIndex = "result_index"
    }

    func withResult(_ index: Int) -> PostDiagnosis {
        PostDiagnosis(id: id, creatorId: creatorId, title: title, diagnosisDescription: diagnosisDescription,
                      outcomes: outcomes, questions: questions, resultIndex: index,
                      result: outcomes.indices.contains(index) ? outcomes[index] : nil)
    }
}

nonisolated struct DiagnosisOutcomeDraft: Hashable, Sendable, Identifiable {
    let id: UUID
    var title: String
    var description: String

    init(id: UUID = UUID(), title: String = "", description: String = "") {
        self.id = id
        self.title = title
        self.description = description
    }
}

nonisolated struct DiagnosisAnswerDraft: Hashable, Sendable, Identifiable {
    let id: UUID
    var text: String
    var resultIndex: Int

    init(id: UUID = UUID(), text: String = "", resultIndex: Int = 0) {
        self.id = id
        self.text = text
        self.resultIndex = resultIndex
    }
}

nonisolated struct DiagnosisQuestionDraft: Hashable, Sendable, Identifiable {
    let id: UUID
    var prompt: String
    var options: [DiagnosisAnswerDraft]

    init(id: UUID = UUID(), prompt: String = "", options: [DiagnosisAnswerDraft] = [DiagnosisAnswerDraft(), DiagnosisAnswerDraft()]) {
        self.id = id
        self.prompt = prompt
        self.options = options
    }
}

nonisolated struct DiagnosisDraft: Hashable, Sendable {
    var title: String
    var description: String
    var outcomes: [DiagnosisOutcomeDraft]
    var questions: [DiagnosisQuestionDraft]

    static var empty: DiagnosisDraft {
        DiagnosisDraft(title: "", description: "", outcomes: [DiagnosisOutcomeDraft(), DiagnosisOutcomeDraft()],
                       questions: [DiagnosisQuestionDraft()])
    }

    var isValid: Bool {
        guard (1...60).contains(title.trimmingCharacters(in: .whitespacesAndNewlines).count), description.count <= 160,
              (2...6).contains(outcomes.count), (1...10).contains(questions.count) else { return false }
        guard outcomes.allSatisfy({
            (1...40).contains($0.title.trimmingCharacters(in: .whitespacesAndNewlines).count) && $0.description.count <= 160
        }) else { return false }
        return questions.allSatisfy { question in
            (1...120).contains(question.prompt.trimmingCharacters(in: .whitespacesAndNewlines).count) &&
            (2...6).contains(question.options.count) && question.options.allSatisfy { answer in
                (1...60).contains(answer.text.trimmingCharacters(in: .whitespacesAndNewlines).count) &&
                outcomes.indices.contains(answer.resultIndex)
            }
        }
    }

    var encodedOutcomes: [DiagnosisOutcome] {
        outcomes.map { DiagnosisOutcome(title: $0.title.trimmingCharacters(in: .whitespacesAndNewlines),
                                        description: $0.description.trimmingCharacters(in: .whitespacesAndNewlines)) }
    }

    var encodedQuestions: [DiagnosisQuestion] {
        questions.map { question in
            DiagnosisQuestion(prompt: question.prompt.trimmingCharacters(in: .whitespacesAndNewlines),
                options: question.options.map { DiagnosisAnswer(text: $0.text.trimmingCharacters(in: .whitespacesAndNewlines), resultIndex: $0.resultIndex) })
        }
    }

    func makeDiagnosis(id: UUID = UUID(), creatorId: String) -> PostDiagnosis {
        let cleanOutcomes = encodedOutcomes
        return PostDiagnosis(id: id, creatorId: creatorId,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            diagnosisDescription: description.trimmingCharacters(in: .whitespacesAndNewlines),
            outcomes: cleanOutcomes, questions: encodedQuestions, resultIndex: nil, result: nil)
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
