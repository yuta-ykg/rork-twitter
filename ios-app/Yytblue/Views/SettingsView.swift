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
        .task { relations = await store.relationships() }
        .background(Color.irukaBackground)
        .navigationTitle(L("設定"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.system(size: 13, weight: .bold)).foregroundStyle(Color.irukaSecondary)
            content()
        }
    }
}
