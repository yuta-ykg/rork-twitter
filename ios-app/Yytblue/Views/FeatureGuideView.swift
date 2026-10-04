import SwiftUI

private struct FeatureGuideItem: Identifiable {
    let id: String
    let title: String
    let body: String
}

struct FeatureGuideView: View {
    private let sections = [
        FeatureGuideItem(id: "posts", title: "投稿", body: "70文字までの投稿を作成し、返信・いいね・ブックマークを使えます。"),
        FeatureGuideItem(id: "polls", title: "投票・クイズ", body: "投稿に投票を付け、回答後に結果を確認できます。クイズでは複数の正解、正解・惜しい・不正解の判定、選択肢ごとのメッセージや解説を設定できます。"),
        FeatureGuideItem(id: "diagnoses", title: "診断", body: "診断を投稿から遊べるほか、診断一覧で探してその場で遊べます。検索からも診断を見つけられ、結果を投稿で共有できます。"),
        FeatureGuideItem(id: "rankings", title: "ランキング", body: "投稿はいいね数、ユーザーは投稿への合計いいね数、診断は結果共有数を基準に順位を表示します。"),
        FeatureGuideItem(id: "games", title: "ゲームセンター", body: "神経衰弱、1024〜16384のパズル、CPUとの将棋や同じ端末の2人対局を楽しみ、記録を投稿で共有できます。"),
        FeatureGuideItem(id: "communities", title: "コミュニティ", body: "公開コミュニティを作成・検索・参加できます。作成者とモデレーターはメンバーや投稿を管理し、投稿を固定できます。"),
        FeatureGuideItem(id: "lists", title: "リスト", body: "ユーザーをリストに追加すると、そのユーザーの投稿をまとめて確認できます。公開すると共有リンクで誰でも閲覧できます。"),
        FeatureGuideItem(id: "notifications", title: "通知", body: "自分の投稿へのいいね通知を確認し、既読にできます。"),
        FeatureGuideItem(id: "profile", title: "プロフィール", body: "表示名、ユーザー名、自己紹介、プロフィール画像を編集できます。"),
        FeatureGuideItem(id: "settings", title: "設定", body: "テーマ、言語、いいねアイコン、日付表示などを変更できます。"),
        FeatureGuideItem(id: "guest", title: "ゲスト", body: "アカウントなしで試せます。データはこの端末に保存され、30日後に削除されます。"),
        FeatureGuideItem(id: "relationships", title: "ミュート・ブロック中のアカウント", body: "ミュートしたアカウントを非表示にし、ブロックしたアカウントとの関係を制限できます。"),
        FeatureGuideItem(id: "pdf", title: "PDFとして出力", body: "投稿詳細から投稿をPDFとして保存・共有できます。"),
    ]

    var body: some View {
        List {
            Section {
                Text(L("Irukaの主要機能をまとめています。"))
                    .foregroundStyle(.secondary)
            }
            ForEach(sections) { section in
                Section(L(section.title)) {
                    Text(L(section.body))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Section {
                Text(L("設定からいつでもこのガイドを開けます。"))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle(L("機能ガイド"))
        .navigationBarTitleDisplayMode(.inline)
    }
}
