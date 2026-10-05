import Foundation

enum TimelineRecommender {
    private static let topicStopWords: Set<String> = [
        "今日", "明日", "昨日", "投稿", "返信", "です", "ます", "した", "する", "いる", "ある",
        "こと", "もの", "これ", "それ", "この", "その", "ため", "よう", "ので", "から", "まで",
        "さん", "the", "and", "for", "with", "from", "about", "this", "that", "have", "just",
        "your", "you", "are", "was", "but", "not", "all", "can", "our", "what", "when", "then",
        "they", "will", "into", "오늘", "그리고", "이것", "저는", "我们", "你们", "一个", "今天",
        "明天", "帖子", "可以", "这个", "因为"
    ]
    private static let topicRunRegex = try? NSRegularExpression(pattern: "[\\p{Han}\\p{Hiragana}\\p{Katakana}\\p{Hangul}]+")
    private static let latinWordRegex = try? NSRegularExpression(pattern: "[a-z][a-z0-9_-]{1,}")
    private static let hashtagRegex = try? NSRegularExpression(pattern: "#[\\p{L}\\p{N}_-]+")

    static func rank(posts: [Post], bookmarkedIds: Set<UUID>, now: Date = .now) -> [Post] {
        let newestFirst = posts.sorted { $0.createdAt > $1.createdAt }
        guard newestFirst.count > 1 else { return newestFirst }

        let tokensById = Dictionary(uniqueKeysWithValues: newestFirst.map { ($0.id, topicTokens($0.body)) })
        var documentFrequency: [String: Int] = [:]
        for tokens in tokensById.values {
            for token in tokens { documentFrequency[token, default: 0] += 1 }
        }

        var interests: [String: Double] = [:]
        var authors: [String: Double] = [:]
        for post in newestFirst {
            let signal = (post.isLiked ? 2.0 : 0) + (bookmarkedIds.contains(post.id) ? 3.2 : 0) + (post.isMine ? 0.7 : 0)
            guard signal > 0 else { continue }
            let ageDecay = pow(0.5, ageInDays(post.createdAt, now: now) / 60)
            for token in tokensById[post.id] ?? [] {
                let frequency = documentFrequency[token, default: 1]
                let rarity = 1 + log((Double(newestFirst.count) + 1) / (Double(frequency) + 1))
                interests[token, default: 0] += signal * ageDecay * rarity
            }
            if !post.isMine, let userId = post.userId {
                authors[userId, default: 0] += signal * ageDecay
            }
        }
        guard !interests.isEmpty || !authors.isEmpty else { return newestFirst }

        let strongestInterest = interests.values.max() ?? 0
        let strongestAuthor = authors.values.max() ?? 0
        let scores = Dictionary(uniqueKeysWithValues: newestFirst.map { post -> (UUID, Double) in
            let tokens = tokensById[post.id] ?? []
            let matchedInterest = strongestInterest > 0
                ? tokens.reduce(0) { $0 + (interests[$1] ?? 0) / strongestInterest }
                : 0
            var topicMatch = min(1, matchedInterest / sqrt(Double(max(1, tokens.count))))
            if post.isLiked || bookmarkedIds.contains(post.id) || post.isMine { topicMatch *= 0.25 }

            let authorMatch: Double
            if !post.isMine, strongestAuthor > 0, let userId = post.userId {
                authorMatch = min(1, (authors[userId] ?? 0) / strongestAuthor)
            } else {
                authorMatch = 0
            }
            let freshness = pow(0.5, ageInDays(post.createdAt, now: now) / 7)
            let popularity = min(1, log1p(Double(post.likeCount)) / log(51))
            return (post.id, freshness * 0.62 + topicMatch * 0.3 + authorMatch * 0.05 + popularity * 0.03)
        })

        return newestFirst.sorted { left, right in
            let difference = (scores[right.id] ?? 0) - (scores[left.id] ?? 0)
            return difference != 0 ? difference > 0 : left.createdAt > right.createdAt
        }
    }

    private static func ageInDays(_ date: Date, now: Date) -> Double {
        max(0, now.timeIntervalSince(date) / 86_400)
    }

    private static func topicTokens(_ body: String) -> Set<String> {
        let normalized = body.precomposedStringWithCompatibilityMapping.lowercased()
        var tokens = Set<String>()
        let fullRange = NSRange(normalized.startIndex..<normalized.endIndex, in: normalized)
        if let topicRunRegex {
            for match in topicRunRegex.matches(in: normalized, range: fullRange) {
                guard let range = Range(match.range, in: normalized) else { continue }
                let characters = Array(normalized[range])
                guard characters.count > 1 else { continue }
                for index in 0..<(characters.count - 1) {
                    let token = String([characters[index], characters[index + 1]])
                    if !topicStopWords.contains(token) { tokens.insert(token) }
                }
            }
        }
        if let latinWordRegex {
            for match in latinWordRegex.matches(in: normalized, range: fullRange) {
                guard let range = Range(match.range, in: normalized) else { continue }
                let token = String(normalized[range])
                if !topicStopWords.contains(token) { tokens.insert(token) }
            }
        }
        if let hashtagRegex {
            for match in hashtagRegex.matches(in: normalized, range: fullRange) {
                guard let range = Range(match.range, in: normalized) else { continue }
                tokens.insert(String(normalized[range]))
            }
        }
        return tokens
    }
}
