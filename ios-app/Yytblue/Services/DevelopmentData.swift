import Foundation

@MainActor
enum DevelopmentData {
    static let userId = "00000000-0000-4000-8000-000000000001"
    static var enabled: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }
    static var isActive: Bool { enabled && UserDefaults.standard.bool(forKey: "iruka-development-session") }
    static func start() { if enabled { UserDefaults.standard.set(true, forKey: "iruka-development-session") } }
    static func end() { UserDefaults.standard.removeObject(forKey: "iruka-development-session") }
    static var user: AuthManager.User {
        AuthManager.User(id: userId, email: "developer@example.test", name: "開発ユーザー", picture: nil)
    }

    static func posts() -> [Post] {
        if let data = UserDefaults.standard.data(forKey: "iruka-development-posts"),
           let posts = try? JSONDecoder().decode([Post].self, from: data) { return posts }
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
            return post
        }
    }
}
