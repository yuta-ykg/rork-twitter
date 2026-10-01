import Foundation
import Observation

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    private let fileURL: URL

    init() {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory())
        fileURL = directory.appendingPathComponent("iruka-posts.json")
        load()
    }

    var timeline: [Post] {
        posts.sorted { $0.createdAt > $1.createdAt }
    }

    var mine: [Post] {
        timeline.filter(\.isMine)
    }

    var thisWeekCount: Int {
        let calendar = Calendar.current
        guard let start = calendar.dateInterval(of: .weekOfYear, for: Date())?.start else {
            return mine.count
        }
        return mine.filter { $0.createdAt >= start }.count
    }

    func add(body: String) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters else { return }
        let post = Post(
            id: UUID(),
            authorName: "あなた",
            handle: "@you",
            initial: "あ",
            body: trimmed,
            createdAt: Date(),
            isMine: true,
            avatarIndex: 0
        )
        posts.insert(post, at: 0)
        save()
    }

    func toggleLike(id: UUID) {
        guard let index = posts.firstIndex(where: { $0.id == id }) else { return }
        let wasLiked = posts[index].isLiked
        posts[index].storedLikeCount = max(0, posts[index].likeCount + (wasLiked ? -1 : 1))
        posts[index].likedByMe = !wasLiked
        save()
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? JSONDecoder().decode([Post].self, from: data),
              !decoded.isEmpty else {
            posts = Self.seed
            save()
            return
        }
        posts = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(posts) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private static var seed: [Post] {
        let calendar = Calendar.current
        let now = Date()
        func at(hour: Int, minute: Int, daysAgo: Int = 0) -> Date {
            var components = calendar.dateComponents([.year, .month, .day], from: now)
            components.hour = hour
            components.minute = minute
            let base = calendar.date(from: components) ?? now
            return calendar.date(byAdding: .day, value: -daysAgo, to: base) ?? base
        }
        return [
            Post(id: UUID(), authorName: "海野ミナ", handle: "@mina", initial: "海", body: "朝の波が静かで、コーヒーがうまい。", createdAt: at(hour: 7, minute: 42), isMine: false, avatarIndex: 0),
            Post(id: UUID(), authorName: "青木レン", handle: "@ren", initial: "青", body: "今日の一言。深呼吸してから出る。", createdAt: at(hour: 8, minute: 5), isMine: false, avatarIndex: 1),
            Post(id: UUID(), authorName: "ナミ", handle: "@nami", initial: "ナ", body: "電車で見た空が、思ったより青かった。", createdAt: at(hour: 8, minute: 31), isMine: false, avatarIndex: 2),
            Post(id: UUID(), authorName: "カイ", handle: "@kai", initial: "カ", body: "昼休みに一杯。それだけで十分。", createdAt: at(hour: 12, minute: 8), isMine: false, avatarIndex: 3),
            Post(id: UUID(), authorName: "ソラ", handle: "@sora", initial: "ソ", body: "70字で足りることは、思ったより多い。", createdAt: at(hour: 13, minute: 16), isMine: false, avatarIndex: 4),
            Post(id: UUID(), authorName: "あなた", handle: "@you", initial: "海", body: "今日は波の音を聞きながら書く。", createdAt: at(hour: 9, minute: 12), isMine: true, avatarIndex: 0),
            Post(id: UUID(), authorName: "あなた", handle: "@you", initial: "海", body: "短くても、残る。", createdAt: at(hour: 21, minute: 4, daysAgo: 1), isMine: true, avatarIndex: 1),
            Post(id: UUID(), authorName: "あなた", handle: "@you", initial: "海", body: "コーヒーのにおいが少し強い。", createdAt: at(hour: 8, minute: 40, daysAgo: 2), isMine: true, avatarIndex: 2),
            Post(id: UUID(), authorName: "あなた", handle: "@you", initial: "海", body: "明日も一言だけ書こう。", createdAt: at(hour: 22, minute: 18, daysAgo: 3), isMine: true, avatarIndex: 3)
        ]
    }
}
