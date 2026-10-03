import SwiftUI

struct ComposeSheet: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.dismiss) private var dismiss
    var authorName: String = "あなた"
    var handle: String = "@you"
    var initial: String = "あ"
    let onPost: (String, PollDraft?) -> Void

    @State private var draft = ""
    @State private var mode: PollMode = .none
    @State private var allowsMultiple = false
    @State private var explanation = ""
    @State private var options = [
        PollDraftOption(result: .correct),
        PollDraftOption(result: .incorrect)
    ]
    @FocusState private var isFocused: Bool

    private enum PollMode: String, CaseIterable {
        case none, poll, quiz
    }

    private var count: Int { draft.count }
    private var canPost: Bool {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && count <= PostLimits.maxCharacters && (pollDraft?.isValid ?? true)
    }
    private var pollDraft: PollDraft? {
        guard mode != .none else { return nil }
        return PollDraft(kind: mode == .quiz ? .quiz : .poll, allowsMultiple: allowsMultiple,
                         explanation: explanation, options: options)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
              VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    AvatarView(initial: initial, index: 0)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(authorName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                        Text(handle)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.irukaSecondary)
                    }
                }

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

                HStack {
                    Spacer()
                    Text("\(count) / \(PostLimits.maxCharacters)")
                        .font(.system(size: 15, weight: .medium, design: .monospaced))
                        .foregroundStyle(count >= PostLimits.maxCharacters ? Color.red : Color.irukaSecondary)
                        .accessibilityLabel(L("character_count", count, PostLimits.maxCharacters))
                }

                pollEditor
                postButton
              }
              .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(L("新しい投稿"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L("閉じる")) { dismiss() }
                }
            }
        }
        .onAppear { isFocused = true }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
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
        guard canPost else { return }
        onPost(draft, pollDraft)
        dismiss()
    }

    private var pollEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L("投票・クイズ"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
            Picker(L("投稿形式"), selection: $mode) {
                Text(L("なし")).tag(PollMode.none)
                Text(L("投票")).tag(PollMode.poll)
                Text(L("クイズ")).tag(PollMode.quiz)
            }
            .pickerStyle(.segmented)

            if mode != .none {
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
                    options.append(PollDraftOption(result: mode == .quiz ? .incorrect : .incorrect))
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
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
    }
}
