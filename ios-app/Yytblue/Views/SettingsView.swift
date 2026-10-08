import SwiftUI

/// テーマと言語の設定画面。
struct SettingsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-theme") private var theme = "system"

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
            }
            .padding(16)
        }
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
