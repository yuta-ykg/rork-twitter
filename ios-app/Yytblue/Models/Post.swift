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
    var imageUrl: String? = nil

    var characterCount: Int { body.count }
}

enum PostLimits {
    static let maxCharacters = 70
}

enum AvatarPalette {
    static let fills: [String] = ["#8ECAE6", "#CDB4DB", "#F4A6A6", "#95D5B2", "#E9C46A"]
}
