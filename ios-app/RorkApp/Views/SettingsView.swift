import SwiftUI

struct SettingsView: View {
    @AppStorage("iruka-like-icon") private var likeIcon = LikeIcon.heart.rawValue
    @AppStorage("iruka-theme") private var choice = AppTheme.system.rawValue
    @Environment(\.irukaPalette) private var palette
    var body: some View {
        Form {
            Section("外観") {
                Picker("テーマ", selection: $choice) {
                    ForEach(AppTheme.allCases) { theme in Text(theme.title).tag(theme.rawValue) }
                }
                .pickerStyle(.inline)
                Text("システムを選ぶと端末の外観設定に合わせて切り替わります。")
                    .foregroundStyle(palette.secondary)
            }
            .listRowBackground(palette.surface)
            Section("いいねアイコン") {
                Picker("アイコン", selection: $likeIcon) {
                    ForEach(LikeIcon.allCases) { icon in
                        Label(icon.title, systemImage: icon.symbol(liked: false)).tag(icon.rawValue)
                    }
                }
                .pickerStyle(.inline)
                Text("いいねの表示に使うアイコンを選べます。")
                    .foregroundStyle(.secondary)
            }
            .listRowBackground(palette.surface)
        }
        .scrollContentBackground(.hidden)
        .background(palette.background)
        .foregroundStyle(palette.ink)
        .navigationTitle("設定")
        .navigationBarTitleDisplayMode(.inline)
    }
}
