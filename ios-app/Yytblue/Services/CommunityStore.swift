import Foundation
import Observation
import Supabase

nonisolated struct Community: Decodable, Identifiable, Sendable {
    let id: UUID
    let ownerId: String
    let name: String
    let description: String
    let memberCount: Int
    let isMember: Bool
    enum CodingKeys: String, CodingKey {
        case id, name, description
        case ownerId = "owner_id", memberCount = "member_count", isMember = "is_member"
    }
}
nonisolated struct CommunityMember: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let handle: String?
    let status: String
    let role: String
    let isOwner: Bool
    enum CodingKeys: String, CodingKey { case id, name, handle, status, role; case isOwner = "is_owner" }
}
nonisolated struct CommunityPost: Decodable, Identifiable, Sendable {
    let id: UUID
    let userId: String
    let body: String
    let createdAt: String
    let authorName: String
    let handle: String?
    enum CodingKeys: String, CodingKey { case id, body, handle; case userId = "user_id", createdAt = "created_at", authorName = "author_name" }
}
nonisolated struct CommunitySnapshot: Decodable, Sendable {
    let community: Community
    let membership: String?
    let role: String?
    let members: [CommunityMember]
    var posts: [CommunityPost]
    let hasMore: Bool
    enum CodingKeys: String, CodingKey { case community, membership, role, members, posts; case hasMore = "has_more" }
}
nonisolated struct CommunitySearchParams: Encodable, Sendable { let keyword: String; let joined_only: Bool }
nonisolated struct CommunityReadParams: Encodable, Sendable { let target_community_id: UUID; let before_created_at: String?; let before_id: UUID? }
nonisolated struct CommunityMutationParams: Encodable, Sendable {
    let expected_user_id: String
    let operation: String
    let target_community_id: UUID
    let community_name: String
    let community_description: String
    let target_user_id: String?
    let target_post_id: UUID?
    let post_body: String
}

@MainActor @Observable
final class CommunityStore {
    private(set) var communities: [Community] = []
    private(set) var snapshot: CommunitySnapshot?
    private(set) var busy = false
    private(set) var loading = false
    var error: String?
    private var userId: String?
    private var generation = 0
    func configure(userId: String?) {
        guard self.userId != userId else { return }
        generation += 1; self.userId = userId
        communities = []; snapshot = nil; busy = false; loading = false; error = nil
    }
    func search(_ keyword: String = "", joinedOnly: Bool = false) async {
        generation += 1
        let epoch = generation
        communities = []; error = nil; loading = true
        defer { if generation == epoch { loading = false } }
        guard !DevelopmentData.isActive else { return }
        guard keyword.unicodeScalars.count <= 40 else { return }
        do {
            let result: [Community] = try await IrukaDatabase.client.rpc("find_communities", params: CommunitySearchParams(keyword: keyword, joined_only: joinedOnly)).execute().value
            if generation == epoch && !Task.isCancelled { communities = result }
        } catch { if generation == epoch && !Task.isCancelled { self.error = "コミュニティを読み込めませんでした。" } }
    }
    func load(_ id: UUID, more: Bool = false) async {
        guard !busy else { return }
        let epoch = generation
        let cursor = more ? snapshot?.posts.last : nil
        if more && (cursor == nil || snapshot?.hasMore != true) { return }
        busy = true; loading = !more; error = nil
        if !more { snapshot = nil }
        defer { if generation == epoch { busy = false; loading = false } }
        guard !DevelopmentData.isActive else { return }
        do {
            var result: CommunitySnapshot? = try await IrukaDatabase.client.rpc("get_community", params: CommunityReadParams(
                target_community_id: id, before_created_at: cursor?.createdAt, before_id: cursor?.id)).execute().value
            guard generation == epoch, !Task.isCancelled else { return }
            if more, let old = snapshot?.posts, let new = result?.posts { result?.posts = old + new.filter { post in !old.contains { $0.id == post.id } } }
            snapshot = result
        } catch { if generation == epoch && !Task.isCancelled { self.error = "コミュニティを読み込めませんでした。" } }
    }
    static func valid(name: String, description: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && trimmed.unicodeScalars.count <= 40 && description.unicodeScalars.count <= 160
    }
    @discardableResult
    func perform(_ operation: String, id: UUID, user: AuthManager.User, name: String = "", description: String = "",
                 memberId: String? = nil, postId: UUID? = nil, body: String = "") async -> Bool {
        guard !busy, userId == user.id else { return false }
        guard !DevelopmentData.isActive else { error = "コミュニティを利用するにはAppleかGoogleでログインしてください。"; return false }
        if (operation == "create" || operation == "update") && !Self.valid(name: name, description: description) {
            error = "コミュニティ名は1〜40文字、説明は160文字以内で入力してください。"; return false
        }
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        if operation == "post" && (trimmed.isEmpty || trimmed.unicodeScalars.count > 70) { error = "投稿は1〜70文字で入力してください。"; return false }
        let epoch = generation
        busy = true; error = nil
        defer { if generation == epoch { busy = false } }
        do {
            try await ProfileService.ensure(user)
            let result: CommunitySnapshot? = try await IrukaDatabase.client.rpc("manage_community", params: CommunityMutationParams(
                expected_user_id: user.id, operation: operation, target_community_id: id, community_name: name,
                community_description: description, target_user_id: memberId, target_post_id: postId, post_body: trimmed)).execute().value
            guard generation == epoch, !Task.isCancelled else { return false }
            snapshot = result
            return true
        } catch {
            if generation == epoch && !Task.isCancelled { self.error = "コミュニティの操作に失敗しました。再読み込みして参加状態を確認してください。" }
            return false
        }
    }
}
