import SwiftUI

/// 投稿作成の専用画面。シートではなくNavigationStackにpushされて表示される。
struct ComposeView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(PostStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var draft = ""
    @State private var mode: AttachmentMode = .none
    @State private var allowsMultiple = false
    @State private var explanation = ""
    @State private var options = [
        PollDraftOption(result: .correct),
        PollDraftOption(result: .incorrect)
    ]
    @State private var diagnosisTitle = ""
    @State private var diagnosisDescription = ""
    @State private var diagnosisOutcomes = [DiagnosisOutcomeDraft(), DiagnosisOutcomeDraft()]
    @State private var diagnosisQuestions = [DiagnosisQuestionDraft()]
    @FocusState private var isFocused: Bool

    private enum AttachmentMode: Hashable {
        case none, poll, quiz, diagnosis
    }

    private var count: Int { draft.count }
    private var canPost: Bool {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && count <= PostLimits.maxCharacters && (pollDraft?.isValid ?? true) && (diagnosisDraft?.isValid ?? true)
    }
    private var pollDraft: PollDraft? {
        guard mode == .poll || mode == .quiz else { return nil }
        return PollDraft(kind: mode == .quiz ? .quiz : .poll, allowsMultiple: allowsMultiple,
                         explanation: explanation, options: options)
    }
    private var diagnosisDraft: DiagnosisDraft? {
        guard mode == .diagnosis else { return nil }
        return DiagnosisDraft(title: diagnosisTitle, description: diagnosisDescription,
                              outcomes: diagnosisOutcomes, questions: diagnosisQuestions)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                authorHeader
                draftEditor
                counter
                if mode == .diagnosis {
                    diagnosisEditor
                } else if mode != .none {
                    pollEditor
                }
                attachmentToolbar
                postButton
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle(L("新しい投稿"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { isFocused = true }
    }

    /// アイコンをもう一度押すと解除。別のアイコンを押すと編集UIを入れ替える。
    private func toggle(_ target: AttachmentMode) {
        mode = mode == target ? .none : target
    }

    private var authorHeader: some View {
        HStack(spacing: 12) {
            AvatarView(initial: auth.user?.initial ?? "あ", index: 0)
            VStack(alignment: .leading, spacing: 2) {
                Text(auth.user?.displayName ?? L("あなた"))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.irukaInk)
                Text(auth.user?.handle ?? "@you")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.irukaSecondary)
            }
        }
    }

    private var draftEditor: some View {
        ZStack(alignment: .topLeading) {
            if draft.isEmpty {
                Text(L("今の気持ちを、70字まで。"))
                    .font(.system(size: 17))
                    .foregroundStyle(Color.irukaSecondary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 16)
                    .allowsHitTesting(false)
            }
            TextEditor(text: $draft)
                .font(.system(size: 17))
                .foregroundStyle(Color.irukaInk)
                .scrollContentBackground(.hidden)
                .focused($isFocused)
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .onChange(of: draft) { _, newValue in
                    if newValue.count > PostLimits.maxCharacters {
                        draft = String(newValue.prefix(PostLimits.maxCharacters))
                    }
                }
        }
        .frame(minHeight: 180)
        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var counter: some View {
        HStack {
            Spacer()
            Text("\(count) / \(PostLimits.maxCharacters)")
                .font(.system(size: 15, weight: .medium, design: .monospaced))
                .foregroundStyle(count >= PostLimits.maxCharacters ? Color.red : Color.irukaSecondary)
                .accessibilityLabel(L("character_count", count, PostLimits.maxCharacters))
        }
    }

    /// 投票・クイズ・診断のアイコン。押すと対応する編集UIがこの行の上に現れる。
    private var attachmentToolbar: some View {
        HStack(spacing: 6) {
            attachmentIcon(symbol: "chart.bar.fill", title: "投票", active: mode == .poll) { toggle(.poll) }
            attachmentIcon(symbol: "questionmark.circle", title: "クイズ", active: mode == .quiz) { toggle(.quiz) }
            attachmentIcon(symbol: "stethoscope", title: "診断", active: mode == .diagnosis) { toggle(.diagnosis) }
            Spacer()
        }
    }

    private func attachmentIcon(symbol: String, title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .medium))
                .frame(width: 44, height: 44)
                .foregroundStyle(active ? Color.irukaBlue : Color.irukaSecondary)
                .background(active ? Color.irukaBlue.opacity(0.14) : Color.clear,
                            in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L(title))
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    private var postButton: some View {
        Button(action: submit) {
            Text(L("投稿する"))
                .font(.system(size: 17, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(minHeight: 52)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color.irukaBlue)
        .disabled(!canPost)
    }

    private func submit() {
        guard canPost, let user = auth.user else { return }
        store.add(body: draft, poll: pollDraft, diagnosis: diagnosisDraft, user: user)
        dismiss()
    }

    private var pollEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L(mode == .quiz ? "クイズ" : "投票"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
            ForEach(options.indices, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        TextField(L("選択肢"), text: $options[index].text)
                            .textFieldStyle(.roundedBorder)
                            .accessibilityLabel(L("選択肢") + " \(index + 1)")
                        Button {
                            guard options.count > 2 else { return }
                            options.remove(at: index)
                        } label: {
                            Image(systemName: "minus.circle")
                                .foregroundStyle(options.count > 2 ? Color.red : Color.irukaSecondary)
                        }
                        .disabled(options.count <= 2)
                        .accessibilityLabel(L("選択肢を削除"))
                    }
                    if mode == .quiz {
                        Picker(L("判定"), selection: $options[index].result) {
                            ForEach(PollOptionResult.allCases) { result in
                                Text(L(result.message)).tag(result)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: options[index].result) { _, _ in
                            if options.filter({ $0.result == .correct }).count > 1 { allowsMultiple = true }
                        }
                        TextField(L("回答後のメッセージ（任意）"), text: $options[index].feedback, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(1...3)
                    }
                }
                .padding(10)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button {
                guard options.count < 6 else { return }
                options.append(PollDraftOption(result: .incorrect))
            } label: {
                Label(L("選択肢を追加"), systemImage: "plus")
                    .font(.system(size: 14, weight: .medium))
            }
            .disabled(options.count >= 6)

            Toggle(L("複数の選択肢を回答できるようにする"), isOn: $allowsMultiple)
                .tint(Color.irukaBlue)
                .disabled(mode == .quiz && options.filter { $0.result == .correct }.count > 1)
            if mode == .quiz {
                Text(L("正解は複数設定できます。複数正解の場合は複数選択となり、判定は回答後に表示されます。"))
                    .font(.system(size: 12))
                    .foregroundStyle(Color.irukaSecondary)
                TextField(L("回答後の解説（任意）"), text: $explanation, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)
                    .onChange(of: explanation) { _, value in
                        if value.count > 280 { explanation = String(value.prefix(280)) }
                    }
            } else {
                Text(L("回答後に投票結果を表示します。"))
                    .font(.system(size: 12))
                    .foregroundStyle(Color.irukaSecondary)
            }
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
    }

    private var diagnosisEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L("みんなで遊べる診断"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
            Text(L("遊び・エンタメ用の診断です。医療や病気の判定には使わないでください。"))
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.orange)
            TextField(L("診断タイトル"), text: $diagnosisTitle)
                .textFieldStyle(.roundedBorder)
                .onChange(of: diagnosisTitle) { _, value in
                    if value.count > 60 { diagnosisTitle = String(value.prefix(60)) }
                }
            TextField(L("診断の説明（任意）"), text: $diagnosisDescription, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...3)
                .onChange(of: diagnosisDescription) { _, value in
                    if value.count > 160 { diagnosisDescription = String(value.prefix(160)) }
                }

            Text(L("診断結果"))
                .font(.system(size: 14, weight: .semibold))
            ForEach(diagnosisOutcomes.indices, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        TextField(L("結果名"), text: $diagnosisOutcomes[index].title)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: diagnosisOutcomes[index].title) { _, value in
                                if value.count > 40 { diagnosisOutcomes[index].title = String(value.prefix(40)) }
                            }
                        Button { removeDiagnosisOutcome(at: index) } label: {
                            Image(systemName: "minus.circle").foregroundStyle(diagnosisOutcomes.count > 2 ? Color.red : Color.irukaSecondary)
                        }
                        .disabled(diagnosisOutcomes.count <= 2)
                        .accessibilityLabel(L("結果を削除"))
                    }
                    TextField(L("結果の説明"), text: $diagnosisOutcomes[index].description, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...3)
                        .onChange(of: diagnosisOutcomes[index].description) { _, value in
                            if value.count > 160 { diagnosisOutcomes[index].description = String(value.prefix(160)) }
                        }
                }
                .padding(10)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            Button {
                guard diagnosisOutcomes.count < 6 else { return }
                diagnosisOutcomes.append(DiagnosisOutcomeDraft())
            } label: { Label(L("結果を追加"), systemImage: "plus") }
                .disabled(diagnosisOutcomes.count >= 6)

            Text(L("質問"))
                .font(.system(size: 14, weight: .semibold))
            ForEach(diagnosisQuestions.indices, id: \.self) { questionIndex in
                VStack(alignment: .leading, spacing: 9) {
                    HStack {
                        TextField(L("質問"), text: $diagnosisQuestions[questionIndex].prompt, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: diagnosisQuestions[questionIndex].prompt) { _, value in
                                if value.count > 120 { diagnosisQuestions[questionIndex].prompt = String(value.prefix(120)) }
                            }
                        Button {
                            guard diagnosisQuestions.count > 1 else { return }
                            diagnosisQuestions.remove(at: questionIndex)
                        } label: { Image(systemName: "minus.circle").foregroundStyle(diagnosisQuestions.count > 1 ? Color.red : Color.irukaSecondary) }
                            .disabled(diagnosisQuestions.count <= 1)
                            .accessibilityLabel(L("質問を削除"))
                    }
                    ForEach(diagnosisQuestions[questionIndex].options.indices, id: \.self) { answerIndex in
                        HStack(alignment: .top, spacing: 7) {
                            TextField(L("回答の選択肢"), text: $diagnosisQuestions[questionIndex].options[answerIndex].text)
                                .textFieldStyle(.roundedBorder)
                                .onChange(of: diagnosisQuestions[questionIndex].options[answerIndex].text) { _, value in
                                    if value.count > 60 { diagnosisQuestions[questionIndex].options[answerIndex].text = String(value.prefix(60)) }
                                }
                            Picker(L("この回答が示す結果"), selection: $diagnosisQuestions[questionIndex].options[answerIndex].resultIndex) {
                                ForEach(diagnosisOutcomes.indices, id: \.self) { outcomeIndex in
                                    Text(diagnosisOutcomes[outcomeIndex].title.isEmpty ? "\(L("診断結果")) \(outcomeIndex + 1)" : diagnosisOutcomes[outcomeIndex].title)
                                        .tag(outcomeIndex)
                                }
                            }
                            .pickerStyle(.menu)
                            Button {
                                guard diagnosisQuestions[questionIndex].options.count > 2 else { return }
                                diagnosisQuestions[questionIndex].options.remove(at: answerIndex)
                            } label: { Image(systemName: "minus.circle").foregroundStyle(diagnosisQuestions[questionIndex].options.count > 2 ? Color.red : Color.irukaSecondary) }
                                .disabled(diagnosisQuestions[questionIndex].options.count <= 2)
                                .accessibilityLabel(L("選択肢を削除"))
                        }
                    }
                    Button {
                        guard diagnosisQuestions[questionIndex].options.count < 6 else { return }
                        diagnosisQuestions[questionIndex].options.append(DiagnosisAnswerDraft(resultIndex: 0))
                    } label: { Label(L("選択肢を追加"), systemImage: "plus") }
                        .disabled(diagnosisQuestions[questionIndex].options.count >= 6)
                }
                .padding(10)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            Button {
                guard diagnosisQuestions.count < 10 else { return }
                diagnosisQuestions.append(DiagnosisQuestionDraft())
            } label: { Label(L("質問を追加"), systemImage: "plus") }
                .disabled(diagnosisQuestions.count >= 10)
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
    }

    private func removeDiagnosisOutcome(at index: Int) {
        guard diagnosisOutcomes.count > 2, diagnosisOutcomes.indices.contains(index) else { return }
        diagnosisOutcomes.remove(at: index)
        for questionIndex in diagnosisQuestions.indices {
            for answerIndex in diagnosisQuestions[questionIndex].options.indices {
                let current = diagnosisQuestions[questionIndex].options[answerIndex].resultIndex
                diagnosisQuestions[questionIndex].options[answerIndex].resultIndex = current == index ? 0 : (current > index ? current - 1 : current)
            }
        }
    }
}
