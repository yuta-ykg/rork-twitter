import SwiftUI

struct SettingsView: View {
    @AppStorage("iruka-like-icon") private var likeIcon = LikeIcon.heart.rawValue
    var body: some View {
        Form {
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
        }
        .navigationTitle("設定")
        .navigationBarTitleDisplayMode(.inline)
    }
}
