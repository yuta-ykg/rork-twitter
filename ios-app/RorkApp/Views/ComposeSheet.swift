import SwiftUI

struct ComposeSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onPost: (String) -> Void

    @State private var draft = ""
    @FocusState private var isFocused: Bool

    private var count: Int { draft.count }
    private var canPost: Bool {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && count <= PostLimits.maxCharacters
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    AvatarView(initial: "あ", index: 0)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("あなた")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                        Text("@you")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.irukaSecondary)
                    }
                }

                ZStack(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text("今の気持ちを、70字まで。")
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
                .frame(minHeight: 220)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                HStack {
                    Spacer()
                    Text("\(count) / \(PostLimits.maxCharacters)")
                        .font(.system(size: 15, weight: .medium, design: .monospaced))
                        .foregroundStyle(count >= PostLimits.maxCharacters ? Color.red : Color.irukaSecondary)
                        .accessibilityLabel("\(count)字、上限\(PostLimits.maxCharacters)字")
                }

                postButton
            }
            .padding(20)
            .navigationTitle("新しい投稿")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
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
            Text("投稿する")
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
        onPost(draft)
        dismiss()
    }
}
