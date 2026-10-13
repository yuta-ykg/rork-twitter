import SwiftUI

/// テーマと言語の設定画面。
struct SettingsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-theme") private var theme = "system"
    @Environment(PostStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @State private var relations: [RelationshipRow] = []
    @State private var confirmsSignOut = false
    @State private var confirmsDelete = false
    @State private var isDeleting = false
    @State private var deleteFailed = false
    @State private var showsAddAccount = false
    @State private var switchFailed = false
    @State private var switchingId: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                section(L("テーマ")) {
                    Picker(L("テーマ"), selection: $theme) {
                        Text(L("ライト")).tag("light")
                        Text(L("ダーク")).tag("dark")
                        Text(L("システム")).tag("system")
                    }
                    .pickerStyle(.segmented)
                    Text(L("システムを選ぶと端末の外観設定に合わせて切り替わります。"))
                        .font(.system(size: 13))
                        .foregroundStyle(Color.irukaSecondary)
                }
                section(L("言語")) {
                    Picker(L("言語"), selection: $language) {
                        Text("日本語").tag(AppLanguage.ja.rawValue)
                        Text("English").tag(AppLanguage.en.rawValue)
                    }
                    .pickerStyle(.segmented)
                }
                section(L("アカウントの切り替え")) { accountSwitcher }
                do {
                    section(L("ミュート・ブロック中のアカウント")) {
                        if relations.isEmpty {
                            Text(L("まだありません"))
                                .font(.system(size: 14))
                                .foregroundStyle(Color.irukaSecondary)
                        } else {
                            VStack(spacing: 0) {
                                ForEach(relations) { r in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(r.targetName).font(.system(size: 15, weight: .bold)).foregroundStyle(Color.irukaInk).lineLimit(1)
                                            Text((r.targetHandle.map { "@\($0) · " } ?? "") + L(r.kind == "block" ? "ブロック" : "ミュート"))
                                                .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                                        }
                                        Spacer()
                                        Button(L("解除")) {
                                            Task {
                                                await store.setRelationship(targetId: r.targetId, kind: r.kind, active: false)
                                                relations = await store.relationships()
                                            }
                                        }
                                        .font(.system(size: 14, weight: .bold))
                                        .buttonStyle(.bordered)
                                        .frame(minHeight: 44)
                                    }
                                    .padding(.vertical, 4)
                                    Rectangle().fill(Color.irukaHairline).frame(height: 1)
                                }
                            }
                        }
                    }
                }
                section(L("アカウント")) {
                    Button(L("ログアウト")) { confirmsSignOut = true }
                        .font(.system(size: 16, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .buttonStyle(.bordered)
                    Button(role: .destructive) { confirmsDelete = true } label: {
                        Text(isDeleting ? L("削除中…") : L("アカウントを削除"))
                            .font(.system(size: 16, weight: .semibold))
                            .frame(maxWidth: .infinity, minHeight: 48)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isDeleting)
                }
            }
            .padding(16)
        }
        .alert(L("ログアウトしますか？"), isPresented: $confirmsSignOut) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("ログアウト")) { Task { await auth.signOut() } }
        } message: { Text(L("この端末からサインアウトします。もう一度ログインできます。")) }
        .alert(L("アカウントを削除しますか？"), isPresented: $confirmsDelete) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("削除する"), role: .destructive) {
                Task {
                    isDeleting = true
                    let ok = await store.deleteAccount()
                    isDeleting = false
                    if ok { await auth.signOut() } else { deleteFailed = true }
                }
            }
        } message: { Text(L("投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。")) }
        .alert(L("アカウントを削除できませんでした。"), isPresented: $deleteFailed) {
            Button("OK") {}
        }
        .alert(L("アカウントを切り替えられませんでした。もう一度ログインしてください。"), isPresented: $switchFailed) {
            Button("OK") {}
        }
        .confirmationDialog(L("アカウントを追加"), isPresented: $showsAddAccount, titleVisibility: .visible) {
            Button(L("Googleで続ける")) { Task { await auth.signIn(provider: "google") } }
            Button(L("Appleで続ける")) { Task { await auth.signIn(provider: "apple") } }
            Button(L("キャンセル"), role: .cancel) {}
        } message: { Text(L("別のGoogle／Appleアカウントでログインすると、新しいアカウントとして追加されます。")) }
        .task { relations = await store.relationships() }
        .background(Color.irukaBackground)
        .navigationTitle(L("設定"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private var accountSwitcher: some View {
        VStack(spacing: 0) {
            ForEach(auth.accounts, id: \.id) { account in
                let current = account.id == auth.user?.id
                HStack(spacing: 12) {
                    Button {
                        guard !current, switchingId == nil else { return }
                        Task {
                            switchingId = account.id
                            let ok = await auth.switchAccount(to: account.id)
                            switchingId = nil
                            if !ok { switchFailed = true }
                        }
                    } label: {
                        HStack(spacing: 12) {
                            AvatarView(initial: account.initial, index: 0, url: account.picture, size: 36)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(account.displayName).font(.system(size: 15, weight: .bold)).foregroundStyle(Color.irukaInk).lineLimit(1)
                                Text(account.email).font(.system(size: 13)).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            if current {
                                Image(systemName: "checkmark").foregroundStyle(Color.irukaBlue).accessibilityLabel(L("使用中"))
                            } else if switchingId == account.id {
                                ProgressView()
                            }
                        }
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if !current {
                        Button(L("外す")) { auth.removeAccount(id: account.id) }
                            .font(.system(size: 13, weight: .bold))
                            .buttonStyle(.bordered)
                            .frame(minHeight: 44)
                    }
                }
                .padding(.vertical, 4)
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
            }
            Button { showsAddAccount = true } label: {
                Label(L("アカウントを追加"), systemImage: "plus")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 48)
            }
            .buttonStyle(.bordered)
            .padding(.top, 10)
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.system(size: 13, weight: .bold)).foregroundStyle(Color.irukaSecondary)
            content()
        }
    }
}
