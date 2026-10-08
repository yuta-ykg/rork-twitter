import SwiftUI

struct PostRowView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(PostStore.self) private var store
    let post: Post
    var showsAuthor: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            profileLink {
                AvatarView(initial: post.initial, index: post.avatarIndex, url: post.avatarUrl)
            }
            VStack(alignment: .leading, spacing: 3) {
                if showsAuthor {
                    profileLink {
                        Text(post.authorName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                            .multilineTextAlignment(.leading)
                    }
                }
                if post.parentId != nil { Text(L("返信")).font(.caption).foregroundStyle(.secondary) }
                NavigationLink(value: post) {
                    Text(post.body)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaInk)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .buttonStyle(.plain)
                if let poll = post.poll {
                    PostPollCard(postId: post.id, initialPoll: poll, store: store)
                }
                if let diagnosis = post.diagnosis {
                    PostDiagnosisCard(initialDiagnosis: diagnosis, store: store)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 12)
    }

    /// アイコンと表示名のタップで投稿者のプロフィールへ遷移する。
    /// 開発モードなど userId が無い投稿はリンクにならない。
    @ViewBuilder
    private func profileLink<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        if let userId = post.userId {
            NavigationLink(value: ProfileRoute(id: userId)) { content() }
                .buttonStyle(.plain)
                .accessibilityLabel(L("プロフィール"))
        } else {
            content()
        }
    }
}

struct PostDiagnosisCard: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let initialDiagnosis: PostDiagnosis
    let store: PostStore
    @State private var diagnosis: PostDiagnosis
    @State private var questionIndex = 0
    @State private var scores: [Int]
    @State private var resultIndex: Int?
    @State private var isShowingSharedResult: Bool
    @State private var isSharing = false
    @State private var shareMessage: String?

    init(initialDiagnosis: PostDiagnosis, store: PostStore) {
        self.initialDiagnosis = initialDiagnosis
        self.store = store
        _diagnosis = State(initialValue: initialDiagnosis)
        _scores = State(initialValue: Array(repeating: 0, count: initialDiagnosis.outcomes.count))
        _resultIndex = State(initialValue: initialDiagnosis.resultIndex)
        _isShowingSharedResult = State(initialValue: initialDiagnosis.resultIndex != nil)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack {
                Label(L("診断"), systemImage: "sparkles")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color.irukaBlue)
                Spacer()
                Text("\(diagnosis.questions.count) \(L("問"))")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.irukaSecondary)
            }
            Text(diagnosis.title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
            if !diagnosis.diagnosisDescription.isEmpty {
                Text(diagnosis.diagnosisDescription)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.irukaSecondary)
            }
            Text(L("遊び・エンタメ用の診断です。医療や病気の判定には使わないでください。"))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.orange)

            if let resultIndex, diagnosis.outcomes.indices.contains(resultIndex) {
                resultView(diagnosis.outcomes[resultIndex], isSharedResult: isShowingSharedResult)
            } else if diagnosis.questions.indices.contains(questionIndex) {
                let question = diagnosis.questions[questionIndex]
                Text("\(L("質問")) \(questionIndex + 1) / \(diagnosis.questions.count)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.irukaSecondary)
                Text(question.prompt)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.irukaInk)
                ForEach(Array(question.options.enumerated()), id: \.offset) { item in
                    let answer = item.element
                    Button { choose(answer.resultIndex) } label: {
                        Text(answer.text)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.irukaInk)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(11)
                            .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(12)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
        .onChange(of: initialDiagnosis) { _, updated in
            diagnosis = updated
            scores = Array(repeating: 0, count: updated.outcomes.count)
            questionIndex = 0
            resultIndex = updated.resultIndex
            isShowingSharedResult = updated.resultIndex != nil
        }
        .alert(L("診断"), isPresented: Binding(get: { shareMessage != nil }, set: { if !$0 { shareMessage = nil } })) {
            Button("OK") { shareMessage = nil }
        } message: { Text(L(shareMessage ?? "")) }
    }

    private func resultView(_ outcome: DiagnosisOutcome, isSharedResult: Bool) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(L(isSharedResult ? "この投稿者の結果" : "あなたの診断結果"))
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.irukaSecondary)
            Text(outcome.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Color.irukaInk)
            if !outcome.description.isEmpty {
                Text(outcome.description)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.irukaInk)
            }
            if !isSharedResult {
                Button(action: shareResult) {
                    Text(L(isSharing ? "投稿中…" : "結果を投稿で共有"))
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 42)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.irukaBlue)
                .disabled(isSharing)
            }
            Button(L(isSharedResult ? "診断をやってみる" : "もう一度遊ぶ"), action: restart)
                .font(.system(size: 13, weight: .semibold))
        }
        .padding(11)
        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 11))
    }

    private func choose(_ index: Int) {
        guard scores.indices.contains(index) else { return }
        scores[index] += 1
        if questionIndex + 1 == diagnosis.questions.count {
            let highest = scores.max() ?? 0
            resultIndex = scores.firstIndex(of: highest) ?? 0
        } else {
            questionIndex += 1
        }
    }

    private func restart() {
        questionIndex = 0
        scores = Array(repeating: 0, count: diagnosis.outcomes.count)
        resultIndex = nil
        isShowingSharedResult = false
    }

    private func shareResult() {
        guard let resultIndex, let user = auth.user else {
            shareMessage = "結果を共有するにはログインしてください。"
            return
        }
        isSharing = true
        Task {
            do {
                _ = try await store.shareDiagnosisResult(diagnosis, resultIndex: resultIndex, user: user)
                shareMessage = "診断結果を投稿しました。"
            } catch {
                shareMessage = "診断結果を投稿できませんでした。"
            }
            isSharing = false
        }
    }
}

struct AvatarView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let initial: String
    let index: Int
    var url: String? = nil
    var size: CGFloat = 46

    var body: some View {
        Color(hex: AvatarPalette.fills[abs(index) % AvatarPalette.fills.count])
            .frame(width: size, height: size)
            .overlay {
                avatarImage
                    .allowsHitTesting(false)
            }
            .clipShape(Circle())
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var avatarImage: some View {
        if let url, let imageURL = URL(string: url), imageURL.scheme == "https" {
            AsyncImage(url: imageURL) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    initialLabel
                }
            }
        } else {
            initialLabel
        }
    }

    private var initialLabel: some View {
        Text(initial)
            .font(.system(size: size * 0.36, weight: .semibold))
            .foregroundStyle(Color.irukaInk.opacity(0.72))
    }
}

struct LikeButton: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-like-icon") private var iconChoice = LikeIcon.heart.rawValue
    private var icon: LikeIcon { LikeIcon(rawValue: iconChoice) ?? .heart }
    let post: Post
    let onLike: () -> Void

    var body: some View {
        Button(action: onLike) {
            Label("\(post.likeCount)", systemImage: icon.symbol(liked: post.isLiked))
                .font(.system(size: 15))
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.borderless)
        .foregroundStyle(post.isLiked ? icon.selectedColor : Color.irukaSecondary)
        .accessibilityLabel(post.isLiked ? L("いいねを取り消す") : L("いいね"))
        .accessibilityValue(L("like_count", post.likeCount))
    }
}

enum LikeIcon: String, CaseIterable, Identifiable {
    case heart, star, thumbsUp = "thumbs-up", upvote
    var id: String { rawValue }
    var title: String {
        switch self {
        case .heart: L("デフォルト")
        case .star: L("ふぁぼ")
        case .thumbsUp: L("高評価")
        case .upvote: L("賛成")
        }
    }
    var selectedColor: Color {
        switch self {
        case .heart: .pink
        case .star, .upvote: .orange
        case .thumbsUp: .blue
        }
    }
    func symbol(liked: Bool) -> String {
        let name: String
        switch self {
        case .heart: name = "heart"
        case .star: name = "star"
        case .thumbsUp: name = "hand.thumbsup"
        case .upvote: name = "arrowshape.up"
        }
        return name + (liked ? ".fill" : "")
    }
}

struct PostPollCard: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let postId: UUID
    let store: PostStore
    let initialPoll: PostPoll
    @State private var poll: PostPoll
    @State private var selectedOptionIds: Set<UUID>
    @State private var isSubmitting = false
    @State private var voteError: String?

    init(postId: UUID, initialPoll: PostPoll, store: PostStore) {
        self.postId = postId
        self.initialPoll = initialPoll
        self.store = store
        _poll = State(initialValue: initialPoll)
        _selectedOptionIds = State(initialValue: Set(initialPoll.options.filter(\.selected).map(\.id)))
    }

    private var showsResults: Bool {
        poll.hasResponded || poll.options.contains(where: { $0.voteCount != nil })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(L(poll.kind == .quiz ? "クイズ" : "投票"))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color.irukaBlue)
                Spacer()
                Text("\(poll.responseCount) \(L("回答"))")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.irukaSecondary)
            }

            ForEach(poll.options.sorted(by: { $0.position < $1.position })) { option in
                optionButton(option)
            }

            if !showsResults {
                Button(action: submit) {
                    Text(L(isSubmitting ? "回答を送信中…" : "回答する"))
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 42)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.irukaBlue)
                .disabled(selectedOptionIds.isEmpty || isSubmitting)
            }

            if showsResults, let explanation = poll.explanation, !explanation.isEmpty {
                (Text(L("解説") + ": ").bold() + Text(explanation))
                    .font(.system(size: 13))
                    .foregroundStyle(Color.irukaInk)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 10))
            }
            if !showsResults && poll.allowsMultiple {
                Text(L("複数選択できます。"))
                    .font(.system(size: 11))
                    .foregroundStyle(Color.irukaSecondary)
            }
        }
        .padding(12)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
        .onChange(of: initialPoll) { _, updated in
            poll = updated
            selectedOptionIds = Set(updated.options.filter(\.selected).map(\.id))
        }
        .alert(L("投票"), isPresented: Binding(
            get: { voteError != nil },
            set: { if !$0 { voteError = nil } }
        )) {
            Button("OK") { voteError = nil }
        } message: {
            Text(L(voteError ?? ""))
        }
    }

    private func optionButton(_ option: PostPollOption) -> some View {
        let result = showsResults && poll.kind == .quiz ? option.result : nil
        let denominator = max(poll.responseCount, 1)
        let percentage = option.voteCount.map { Int((Double($0) / Double(denominator) * 100).rounded()) }
        let background: Color
        if result == .correct { background = Color.green.opacity(0.10) }
        else if result == .close { background = Color.orange.opacity(0.12) }
        else { background = selectedOptionIds.contains(option.id) ? Color.irukaBlue.opacity(0.10) : Color.irukaField }

        return Button {
            guard !showsResults, !isSubmitting else { return }
            if poll.allowsMultiple {
                if selectedOptionIds.contains(option.id) { selectedOptionIds.remove(option.id) }
                else { selectedOptionIds.insert(option.id) }
            } else {
                selectedOptionIds = [option.id]
            }
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .top, spacing: 8) {
                    Text(option.text)
                        .font(.system(size: 14, weight: .medium))
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 4)
                    if showsResults, let percentage {
                        Text("\(percentage)%")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                    } else if selectedOptionIds.contains(option.id) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.irukaBlue)
                    }
                }
                if showsResults, let result {
                    Text(option.feedback.flatMap { $0.isEmpty ? nil : $0 } ?? L(result.message))
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if showsResults, let percentage {
                    ProgressView(value: Double(percentage), total: 100)
                        .tint(result == .correct ? Color.green : Color.irukaBlue)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(result == .correct ? Color.green : Color.irukaHairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(showsResults || isSubmitting)
        .accessibilityAddTraits(selectedOptionIds.contains(option.id) ? .isSelected : [])
    }

    private func submit() {
        guard !selectedOptionIds.isEmpty, !isSubmitting else { return }
        guard let userId = auth.user?.id else {
            voteError = "回答するにはAppleかGoogleでログインしてください。"
            return
        }
        isSubmitting = true
        Task {
            defer { isSubmitting = false }
            do {
                poll = try await store.submitPoll(postId: postId, optionIds: Array(selectedOptionIds), userId: userId)
                selectedOptionIds = Set(poll.options.filter(\.selected).map(\.id))
            } catch {
                voteError = "回答を保存できませんでした。"
            }
        }
    }
}
