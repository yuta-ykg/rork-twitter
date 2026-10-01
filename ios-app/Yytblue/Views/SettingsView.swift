import SwiftUI

struct SettingsView: View {
    @AppStorage("iruka-bottom-bar-labels") private var showBottomBarLabels = false
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-like-icon") private var likeIcon = LikeIcon.heart.rawValue
    var body: some View {
        Form {
            Section(L("ボトムバー")) {
                Toggle(L("ボトムバーの文字を表示"), isOn: $showBottomBarLabels)
            }

            Section(L("言語")) {
                Picker(L("言語"), selection: $language) {
                    ForEach(AppLanguage.allCases) { option in Text(option.title).tag(option.rawValue) }
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
    }
}
