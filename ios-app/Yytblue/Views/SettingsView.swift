import PostgREST
import Supabase
import SwiftUI

struct SettingsView: View {
    @AppStorage("iruka-bottom-bar-labels") private var showBottomBarLabels = false
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-date-display") private var dateDisplay = DateDisplayStyle.relative.rawValue
    @AppStorage("iruka-like-icon") private var likeIcon = LikeIcon.heart.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(RelationshipStore.self) private var relationships
    @State private var pendingRelationship: String?
    @State private var confirmsDelete = false
    @State private var deleting = false
    @State private var deleteError: String?
    @State private var confirmsLogout = false
    var body: some View {
        Form {
            Section(L("アカウント")) {
                if let user = auth.user {
                    LabeledContent(L("メールアドレス"), value: DevelopmentData.isGuest ? L("ゲスト") : (user.email.isEmpty ? L("未設定") : user.email))
                    if DevelopmentData.isGuest {
                        Text(L("アカウント登録なしで試せます。データはこの端末にだけ保存され、30日で削除されます。"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    Button(deleting ? L("削除中…") : L("アカウントを削除"), role: .destructive) {
                        confirmsDelete = true
                    }
                    .disabled(deleting)
                    Button(L("ログアウト"), role: .destructive) { confirmsLogout = true }
                    if let deleteError {
                        Text(L(deleteError)).foregroundStyle(.red)
                    }
                } else {
                    Text(L("ログインしていません。")).foregroundStyle(.secondary)
                }
            }
            if auth.user != nil {
                Section(L("ミュート中")) {
                    ForEach(relationships.rows.filter { $0.kind == "mute" }, id: \.targetId) { row in
                        HStack {
                            Text(row.targetName)
                            Spacer()
                            Button(L("解除")) { remove(row) }
                                .disabled(pendingRelationship != nil)
                        }
                    }
                }
                Section(L("ブロック中")) {
                    ForEach(relationships.rows.filter { $0.kind == "block" }, id: \.targetId) { row in
                        HStack {
                            Text(row.targetName)
                            Spacer()
                            Button(L("解除")) { remove(row) }
                                .disabled(pendingRelationship != nil)
                        }
                    }
                }
                if let error = relationships.error {
                    Text(L(error)).foregroundStyle(.red)
                }
            }
            Section(L("ボトムバー")) {
                Toggle(L("ボトムバーの文字を表示"), isOn: $showBottomBarLabels)
            }

            Section(L("言語")) {
                Picker(L("言語"), selection: $language) {
                    ForEach(AppLanguage.allCases) { option in Text(option.title).tag(option.rawValue) }
                }
                .pickerStyle(.inline)
            }
            Section(L("日付表示")) {
                Picker(L("日付表示"), selection: $dateDisplay) {
                    ForEach(DateDisplayStyle.allCases) { option in Text(L(option.label)).tag(option.rawValue) }
                }
                .pickerStyle(.inline)
            }
            Section(L("いいねアイコン")) {
                Picker(L("アイコン"), selection: $likeIcon) {
                    ForEach(LikeIcon.allCases) { icon in
                        Label(icon.title, systemImage: icon.symbol(liked: false)).tag(icon.rawValue)
                    }
                }
                .pickerStyle(.inline)
                Text(L("いいねの表示に使うアイコンを選べます。"))
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle(L("設定"))
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(L("アカウントを削除しますか？"), isPresented: $confirmsDelete, titleVisibility: .visible) {
            Button(L("削除する"), role: .destructive) { deleteAccount() }
            Button(L("キャンセル"), role: .cancel) {}
        } message: {
            Text(L("投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。"))
        }
        .confirmationDialog(L("ログアウトしますか？"), isPresented: $confirmsLogout, titleVisibility: .visible) {
            Button(L("ログアウト"), role: .destructive) { Task { await auth.signOut() } }
            Button(L("キャンセル"), role: .cancel) {}
        } message: {
            Text(L("この端末からサインアウトします。もう一度ログインできます。"))
        }
    }

    private func deleteAccount() {
        guard let user = auth.user, !deleting else { return }
        deleting = true
        deleteError = nil
        Task {
            defer { deleting = false }
            do {
                if DevelopmentData.isActive {
                    UserDefaults.standard.removeObject(forKey: "iruka-lists:\(user.id)")
                    UserDefaults.standard.removeObject(forKey: "iruka-development-posts")
                    UserDefaults.standard.removeObject(forKey: "iruka-development-profile")
                    UserDefaults.standard.removeObject(forKey: "iruka-relationships-" + user.id)
                    UserDefaults.standard.removeObject(forKey: "iruka:bookmarks:development:\(user.id)")
                } else {
                    try await IrukaDatabase.client
                        .rpc("delete_account", params: DeleteAccountParams(expected_user_id: user.id))
                        .execute()
                    UserDefaults.standard.removeObject(forKey: "iruka:bookmarks:account:\(user.id)")
                }
                await auth.signOut()
            } catch {
                self.deleteError = "アカウントを削除できませんでした。"
            }
        }
    }

    private func remove(_ row: RelationshipRow) {
        pendingRelationship = row.targetId + row.kind
        Task {
            do {
                try await relationships.set(targetId: row.targetId, kind: row.kind, active: false)
            } catch {
                relationships.error = "設定を保存できませんでした。"
            }
            pendingRelationship = nil
        }
    }
}

nonisolated struct DeleteAccountParams: Encodable, Sendable {
    let expected_user_id: String
}
