import Foundation

@MainActor
enum DevelopmentData {
    static let guestTtlDays = 30
    private static let guestTtl: TimeInterval = TimeInterval(guestTtlDays * 24 * 60 * 60)

    enum SessionKind { case developer, guest }

    static var enabled: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }

    struct GuestSession: Codable {
        let id: String
        let startedAt: Date
    }

    static var sessionKind: SessionKind? {
        if UserDefaults.standard.data(forKey: "iruka-guest-session") != nil { return .guest }
        if enabled, UserDefaults.standard.bool(forKey: "iruka-development-session") { return .developer }
        return nil
    }
    static var isActive: Bool { sessionKind != nil }
    static var isGuest: Bool { sessionKind == .guest }

    /// 開発セッションは固定ID、ゲストセッションは開始時に発行したIDを使う。
    static var userId: String {
        if isGuest, let guest = guestSession() { return guest.id }
        return "00000000-0000-4000-8000-000000000001"
    }

    static func start() {
        if enabled { UserDefaults.standard.set(true, forKey: "iruka-development-session") }
    }
    /// 端末ローカルのゲストセッションを開始する。データは引き継がない限り30日で削除される。
    static func startGuest() {
        if let guest = guestSession() { UserDefaults.standard.removeObject(forKey: "iruka-lists:\(guest.id)") }
        UserDefaults.standard.removeObject(forKey: "iruka-development-posts")
        UserDefaults.standard.removeObject(forKey: "iruka-development-profile")
        let session = GuestSession(id: UUID().uuidString, startedAt: Date())
        UserDefaults.standard.set(session.id, forKey: "iruka-guest-list-owner")
        if let data = try? JSONEncoder().encode(session) {
            UserDefaults.standard.set(data, forKey: "iruka-guest-session")
        }
    }
    static func end() {
        UserDefaults.standard.removeObject(forKey: "iruka-development-session")
        UserDefaults.standard.removeObject(forKey: "iruka-guest-session")
    }
    /// ゲストの投稿・プロフィール・セッションをすべて削除する。
    static func clearGuestData() {
        if let owner = UserDefaults.standard.string(forKey: "iruka-guest-list-owner") {
            UserDefaults.standard.removeObject(forKey: "iruka-lists:\(owner)")
        }
        UserDefaults.standard.removeObject(forKey: "iruka-guest-list-owner")
        end()
        UserDefaults.standard.removeObject(forKey: "iruka-development-posts")
        UserDefaults.standard.removeObject(forKey: "iruka-development-profile")
    }
    /// 保持期限（30日）を過ぎたゲストセッションを終了し、データを削除する。
    @discardableResult
    static func expireGuestIfNeeded() -> Bool {
        guard let session = guestSession() else { return false }
        guard Date().timeIntervalSince(session.startedAt) > guestTtl else { return false }
        clearGuestData()
        return true
    }

    private static func guestSession() -> GuestSession? {
        guard let data = UserDefaults.standard.data(forKey: "iruka-guest-session"),
              let session = try? JSONDecoder().decode(GuestSession.self, from: data) else { return nil }
        return session
    }

    static var user: AuthManager.User {
        if isGuest, let guest = guestSession() {
            return AuthManager.User(id: guest.id, email: "guest@iruka.local", name: "ゲスト", picture: nil)
        }
        return AuthManager.User(id: userId, email: "developer@example.test", name: "開発ユーザー", picture: nil)
    }

    static func posts() -> [Post] {
        if let data = UserDefaults.standard.data(forKey: "iruka-development-posts"),
           let posts = try? JSONDecoder().decode([Post].self, from: data) { return posts }
        if isGuest { save(posts: []); return [] }
        let seed = [Post(id: UUID(), authorName: "開発ユーザー", handle: "@developer", initial: "開",
                         body: "開発用の投稿です。投稿・いいね・プロフィールを試せます。", createdAt: Date(),
                         isMine: true, avatarIndex: 0, userId: userId)]
        save(posts: seed)
        return seed
    }
    static func save(posts: [Post]) {
        guard isActive, let data = try? JSONEncoder().encode(posts) else { return }
        UserDefaults.standard.set(data, forKey: "iruka-development-posts")
    }
    static func profile() -> IrukaProfile {
        var stored: IrukaProfile?
        if let data = UserDefaults.standard.data(forKey: "iruka-development-profile") {
            stored = try? JSONDecoder().decode(IrukaProfile.self, from: data)
        }
        if isGuest {
            return IrukaProfile(id: userId, name: stored?.name ?? "ゲスト", handle: stored?.handle ?? "guest",
                                bio: stored?.bio ?? "", avatarUrl: stored?.avatarUrl,
                                createdAt: stored?.createdAt ?? Date(), postCount: posts().count)
        }
        return IrukaProfile(id: userId, name: stored?.name ?? "開発ユーザー", handle: stored?.handle ?? "developer",
                            bio: stored?.bio ?? "開発用アカウント", avatarUrl: stored?.avatarUrl,
                            createdAt: stored?.createdAt ?? Date(), postCount: posts().count)
    }
    static func save(profile: IrukaProfile) {
        guard isActive, profile.id == userId, let data = try? JSONEncoder().encode(profile) else { return }
        UserDefaults.standard.set(data, forKey: "iruka-development-profile")
    }
    static func timeline() -> [Post] {
        let profile = profile()
        return posts().map { old in
            var post = Post(id: old.id, authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                            initial: String(profile.name.prefix(1)), body: old.body, createdAt: old.createdAt,
                            isMine: true, avatarIndex: old.avatarIndex, userId: userId, parentId: old.parentId, avatarUrl: profile.avatarUrl)
            post.likedByMe = old.isLiked
            post.storedLikeCount = old.likeCount
            post.poll = old.poll
            return post
        }
    }
}
