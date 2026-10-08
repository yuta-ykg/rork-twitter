import SwiftUI

/// テーマと言語の設定画面。
struct SettingsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-theme") private var theme = "system"
    @Environment(PostStore.self) private var store
    @State private var relations: [RelationshipRow] = []

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
                if !DevelopmentData.isActive {
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
            }
            .padding(16)
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
