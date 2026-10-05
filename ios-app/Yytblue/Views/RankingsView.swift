import SwiftUI

private enum RankingCategory: String, CaseIterable, Identifiable {
    case posts, users, diagnoses
    var id: String { rawValue }
    var title: String {
        switch self {
        case .posts: L("投稿")
        case .users: L("ユーザー")
        case .diagnoses: L("診断")
        }
    }
    var description: String {
        switch self {
        case .posts: L("投稿ランキングはいいね数を基準にしています。")
        case .users: L("ユーザーランキングは表示対象の投稿への合計いいね数を基準にしています。")
        case .diagnoses: L("診断ランキングは診断結果を共有した投稿数を基準にしています。")
        }
    }
}

private struct RankedUser: Identifiable {
    let id: String
    let profileId: String?
    let name: String
    let handle: String
    let initial: String
    let avatarIndex: Int
    let avatarUrl: String?
    var totalLikes: Int
    var postCount: Int
}

private struct RankedDiagnosis: Identifiable {
    var id: UUID { diagnosis.id }
    let postId: UUID
    let diagnosis: PostDiagnosis
    var resultShares: Int
}

struct RankingsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @State private var category: RankingCategory = .posts

    private var rankedPosts: [Post] {
        store.timeline.sorted {
            if $0.likeCount != $1.likeCount { return $0.likeCount > $1.likeCount }
            return $0.createdAt > $1.createdAt
        }.prefix(50).map { $0 }
    }

    private var rankedUsers: [RankedUser] {
        var grouped: [String: RankedUser] = [:]
        for post in store.timeline {
            let key = post.userId ?? post.handle
            if var user = grouped[key] {
                user.totalLikes += post.likeCount
                user.postCount += 1
                grouped[key] = user
            } else {
                grouped[key] = RankedUser(id: key, profileId: post.userId, name: post.authorName,
                    handle: post.handle, initial: post.initial, avatarIndex: post.avatarIndex,
                    avatarUrl: post.avatarUrl, totalLikes: post.likeCount, postCount: 1)
            }
        }
        return Array(grouped.values).sorted {
            if $0.totalLikes != $1.totalLikes { return $0.totalLikes > $1.totalLikes }
            if $0.postCount != $1.postCount { return $0.postCount > $1.postCount }
            return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }.prefix(50).map { $0 }
    }

    private var rankedDiagnoses: [RankedDiagnosis] {
        var grouped: [UUID: RankedDiagnosis] = [:]
        for post in store.timeline {
            guard let diagnosis = post.diagnosis else { continue }
            if var item = grouped[diagnosis.id] {
                if diagnosis.resultIndex != nil { item.resultShares += 1 }
                grouped[diagnosis.id] = item
            } else {
                let playable = PostDiagnosis(id: diagnosis.id, creatorId: diagnosis.creatorId, title: diagnosis.title,
                    diagnosisDescription: diagnosis.diagnosisDescription, outcomes: diagnosis.outcomes,
                    questions: diagnosis.questions, resultIndex: nil, result: nil)
                grouped[diagnosis.id] = RankedDiagnosis(postId: post.id, diagnosis: playable,
                    resultShares: diagnosis.resultIndex == nil ? 0 : 1)
            }
        }
        return Array(grouped.values).sorted {
            if $0.resultShares != $1.resultShares { return $0.resultShares > $1.resultShares }
            return $0.diagnosis.title.localizedCaseInsensitiveCompare($1.diagnosis.title) == .orderedAscending
        }.prefix(50).map { $0 }
    }

    var body: some View {
        List {
            Section {
                Picker(L("ランキング"), selection: $category) {
                    ForEach(RankingCategory.allCases) { item in Text(item.title).tag(item) }
                }
                .pickerStyle(.segmented)
                Text(category.description)
                    .font(.footnote)
                    .foregroundStyle(Color.irukaSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .listRowSeparator(.hidden)

            switch category {
            case .posts:
                if rankedPosts.isEmpty {
                    Text(L("ランキング対象の投稿がありません。"))
                        .foregroundStyle(Color.irukaSecondary)
                } else {
                    ForEach(Array(rankedPosts.enumerated()), id: \.offset) { item in
                        HStack(alignment: .top, spacing: 8) {
                            rankBadge(item.offset + 1)
                            VStack(alignment: .leading, spacing: 0) {
                                PostRowView(post: item.element)
                                HStack(spacing: 8) {
                                    LikeButton(post: item.element) { store.toggleLike(id: item.element.id) }
                                    BookmarkButton(postId: item.element.id)
                                }
                                .padding(.leading, 58)
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                    }
                }
            case .users:
                if rankedUsers.isEmpty {
                    Text(L("ランキング対象のユーザーがいません。"))
                        .foregroundStyle(Color.irukaSecondary)
                } else {
                    ForEach(Array(rankedUsers.enumerated()), id: \.element.id) { item in
                        userRow(item.element, rank: item.offset + 1)
                    }
                }
            case .diagnoses:
                if rankedDiagnoses.isEmpty {
                    Text(L("ランキング対象の診断がありません。"))
                        .foregroundStyle(Color.irukaSecondary)
                } else {
                    ForEach(Array(rankedDiagnoses.enumerated()), id: \.element.id) { item in
                        HStack(alignment: .top, spacing: 8) {
                            rankBadge(item.offset + 1)
                            VStack(alignment: .leading, spacing: 6) {
                                PostDiagnosisCard(initialDiagnosis: item.element.diagnosis, store: store)
                                Text("\(L("結果共有数"))  \(item.element.resultShares)")
                                    .font(.caption)
                                    .foregroundStyle(Color.irukaSecondary)
                                    .frame(maxWidth: .infinity, alignment: .trailing)
                            }
                        }
                        .listRowSeparator(.hidden)
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(L("ランキング"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await store.refresh(userId: auth.user?.id) }
    }

    private func rankBadge(_ rank: Int) -> some View {
        Text("\(rank)")
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(Color.irukaSecondary)
            .frame(width: 30, height: 30)
            .background(Color.irukaField, in: Circle())
            .padding(.top, 14)
            .accessibilityLabel(L("順位") + " \(rank)")
    }

    @ViewBuilder
    private func userRow(_ user: RankedUser, rank: Int) -> some View {
        HStack(spacing: 10) {
            rankBadge(rank)
            if let profileId = user.profileId {
                NavigationLink(value: ProfileRoute(id: profileId)) { userContents(user) }
                    .buttonStyle(.plain)
            } else {
                userContents(user)
            }
        }
        .padding(.vertical, 5)
    }

    private func userContents(_ user: RankedUser) -> some View {
        HStack(spacing: 10) {
            AvatarView(initial: user.initial, index: user.avatarIndex, url: user.avatarUrl)
            VStack(alignment: .leading, spacing: 3) {
                Text(user.name).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.irukaInk)
                Text(user.handle).font(.caption).foregroundStyle(Color.irukaSecondary)
                Text("\(L("いいね数")) \(user.totalLikes) · \(L("投稿数")) \(user.postCount)")
                    .font(.caption2).foregroundStyle(Color.irukaSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
