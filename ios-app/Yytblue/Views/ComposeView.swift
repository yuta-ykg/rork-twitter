import PhotosUI
import SwiftUI

/// 70字までの本文だけを書く投稿画面。
struct ComposeView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(PostStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue

    @State private var draft = ""
    @State private var pickerItem: PhotosPickerItem?
    @State private var imageData: Data?
    @FocusState private var isFocused: Bool

    private var count: Int { draft.count }
    private var canPost: Bool {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && count <= PostLimits.maxCharacters
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                AvatarView(initial: auth.user?.initial ?? "あ", index: 0, url: auth.user?.picture, size: 40)
                ZStack(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text(L("今の気持ちを、70字まで。"))
                            .font(.system(size: 18))
                            .foregroundStyle(Color.irukaSecondary)
                            .padding(.top, 8)
                            .allowsHitTesting(false)
                    }
                    TextEditor(text: $draft)
                        .font(.system(size: 18))
                        .foregroundStyle(Color.irukaInk)
                        .scrollContentBackground(.hidden)
                        .focused($isFocused)
                        .frame(minHeight: 160)
                        .onChange(of: draft) { _, newValue in
                            if newValue.count > PostLimits.maxCharacters {
                                draft = String(newValue.prefix(PostLimits.maxCharacters))
                            }
                        }
                }
            }
            if let imageData, let preview = UIImage(data: imageData) {
                Color.clear
                    .frame(height: 220)
                    .overlay { Image(uiImage: preview).resizable().aspectRatio(contentMode: .fill).allowsHitTesting(false) }
                    .clipShape(.rect(cornerRadius: 16))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            self.imageData = nil
                            pickerItem = nil
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 30, height: 30)
                                .background(.black.opacity(0.65), in: Circle())
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("画像を外す"))
                    }
                    .padding(.leading, 52)
            }
            Spacer(minLength: 0)
            HStack {
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 22))
                        .foregroundStyle(Color.irukaBlue)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L("画像を追加"))
                Spacer()
                Text("\(count) / \(PostLimits.maxCharacters)")
                    .font(.system(size: 15, weight: .medium, design: .monospaced))
                    .foregroundStyle(count >= PostLimits.maxCharacters ? Color.red : Color.irukaSecondary)
                    .accessibilityLabel("\(count) / \(PostLimits.maxCharacters)")
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .background(Color.white)
        .navigationTitle(L("新しい投稿"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(L("キャンセル")) { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(action: submit) {
                    Text(L("投稿する"))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 32)
                        .background(canPost ? Color.irukaBlue : Color.irukaBlue.opacity(0.35), in: Capsule())
                }
                .disabled(!canPost)
                .accessibilityLabel(L("投稿する"))
            }
        }
        .onAppear { isFocused = true }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                guard let raw = try? await item.loadTransferable(type: Data.self) else { return }
                imageData = await Task.detached { PostStore.compressedJPEG(from: raw) }.value
            }
        }
    }

    private func submit() {
        guard canPost, let user = auth.user else { return }
        store.add(body: draft, image: imageData, user: user)
        dismiss()
    }
}
