import PhotosUI
import SwiftUI

struct EditProfileView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PostStore
    let profile: IrukaProfile
    var onSaved: (IrukaProfile) -> Void

    @State private var name: String
    @State private var handle: String
    @State private var bio: String
    @State private var pickerItem: PhotosPickerItem?
    @State private var avatarData: Data?
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(store: PostStore, profile: IrukaProfile, onSaved: @escaping (IrukaProfile) -> Void) {
        self.store = store
        self.profile = profile
        self.onSaved = onSaved
        _name = State(initialValue: profile.name)
        _handle = State(initialValue: profile.handle ?? "")
        _bio = State(initialValue: profile.bio)
    }

    private var handleIsValid: Bool { handle.wholeMatch(of: ProfileService.handlePattern) != nil }
    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && handleIsValid && !isSaving
    }
    private var previewURL: String? {
        avatarData.map { "data:image/jpeg;base64," + $0.base64EncodedString() } ?? profile.avatarUrl
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    AvatarView(initial: String(name.prefix(1)), index: 0, url: previewURL, size: 96)
                        .overlay {
                            Circle().fill(.black.opacity(0.35))
                                .overlay { Image(systemName: "camera.fill").foregroundStyle(.white) }
                        }
                }
                .frame(maxWidth: .infinity)
                .accessibilityLabel(L("写真を変更"))

                labeled(L("名前")) { TextField("", text: $name) }
                VStack(alignment: .leading, spacing: 4) {
                    labeled(L("ハンドル")) {
                        HStack(spacing: 4) {
                            Text("@").foregroundStyle(Color.irukaSecondary)
                            TextField("", text: $handle)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .onChange(of: handle) { _, new in handle = new.lowercased() }
                        }
                    }
                    if !handle.isEmpty, !handleIsValid {
                        Text(L("英小文字・数字・_ の3〜25文字")).font(.system(size: 12)).foregroundStyle(.red)
                    }
                }
                VStack(alignment: .leading, spacing: 4) {
                    labeled(L("自己紹介")) {
                        TextField("", text: $bio, axis: .vertical)
                            .lineLimit(3...6)
                            .onChange(of: bio) { _, new in if new.count > 160 { bio = String(new.prefix(160)) } }
                    }
                    Text("\(bio.count)/160").font(.system(size: 12)).foregroundStyle(Color.irukaSecondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                if let errorMessage {
                    Text(L(errorMessage)).font(.system(size: 13)).foregroundStyle(.red)
                }
            }
            .padding(16)
        }
        .background(Color.white)
        .navigationTitle(L("プロフィールを編集"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(L("保存")) { Task { await save() } }.disabled(!canSave)
            }
        }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                guard let raw = try? await item.loadTransferable(type: Data.self) else { return }
                avatarData = await Task.detached { PostStore.compressedJPEG(from: raw, maxSide: 480) }.value
            }
        }
    }

    private func labeled<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
            content()
                .padding(10)
                .frame(minHeight: 44)
                .overlay { RoundedRectangle(cornerRadius: 8).stroke(Color.irukaHairline, lineWidth: 1.5) }
        }
    }

    private func save() async {
        guard let id = auth.user?.id, canSave else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let saved = try await ProfileService.save(
                userId: id, name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                handle: handle, bio: bio, avatar: avatarData)
            await store.refresh(userId: id)
            onSaved(saved)
            dismiss()
        } catch {
            let text = String(describing: error)
            errorMessage = text.contains("23505") || text.contains("Handle taken")
                ? "このハンドルは使われています" : "保存できませんでした。もう一度試してください。"
        }
    }
}
