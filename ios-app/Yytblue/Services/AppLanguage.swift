import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable {
    case ja, en, ko
    var id: String { rawValue }
    var title: String {
        switch self { case .ja: "日本語"; case .en: "English"; case .ko: "한국어" }
    }
    static var current: AppLanguage {
        AppLanguage(rawValue: UserDefaults.standard.string(forKey: "iruka-language") ?? "") ?? .ja
    }
    static var locale: Locale { Locale(identifier: current.rawValue) }
}

enum DateDisplayStyle: String, CaseIterable, Identifiable {
    case relative, short, full
    var id: String { rawValue }
    var label: String {
        switch self {
        case .relative: "相対表示"
        case .short: "月日と時刻"
        case .full: "年月日と時刻"
        }
    }
    static var current: DateDisplayStyle {
        DateDisplayStyle(rawValue: UserDefaults.standard.string(forKey: "iruka-date-display") ?? "") ?? .relative
    }
}

func formatDate(_ date: Date, includeTime: Bool = true) -> String {
    let calendar = Calendar.current
    let style = DateDisplayStyle.current
    if style == .relative {
        if calendar.isDateInToday(date) {
            return includeTime ? L("today_time", date.formatted(.dateTime.locale(AppLanguage.locale).hour().minute())) : L("今日")
        }
        if calendar.isDateInYesterday(date) {
            return includeTime ? L("yesterday_time", date.formatted(.dateTime.locale(AppLanguage.locale).hour().minute())) : L("昨日")
        }
    }
    var format = date.formatted(.dateTime.locale(AppLanguage.locale).month().day())
    if style == .full { format = date.formatted(.dateTime.locale(AppLanguage.locale).year().month().day()) }
    if includeTime { format += " " + date.formatted(.dateTime.locale(AppLanguage.locale).hour().minute()) }
    return format
}

private let englishMessages: [String: String] = [
  "コミュニティ、メンバー情報、すべての投稿が削除されます。この操作は取り消せません。": "The community, memberships and all its posts will be deleted. This cannot be undone.",
  "コミュニティ": "Communities",
  "誰でも閲覧・参加できます。投稿するには参加が必要です。": "Anyone can view and join. Join to post.",
  "コミュニティを利用するにはAppleかGoogleでログインしてください。": "Sign in with Apple or Google to participate in communities.",
  "コミュニティを読み込めませんでした。": "Could not load the community.",
  "コミュニティの操作に失敗しました。再読み込みして参加状態を確認してください。": "Could not complete the action. Refresh to check your membership.",
  "コミュニティ名は1〜40文字、説明は160文字以内で入力してください。": "Community names must contain 1–40 characters and descriptions at most 160 characters.",
  "コミュニティを検索": "Search communities",
  "参加中のみ": "Joined communities only",
  "参加中": "Joined",
  "コミュニティを作成": "Create community",
  "コミュニティを編集": "Edit community",
  "コミュニティを削除": "Delete community",
  "コミュニティがありません。": "No communities found.",
  "コミュニティが見つかりません。": "Community not found.",
  "参加する": "Join",
  "退出する": "Leave",
  "参加が制限されています。管理者またはモデレーターに確認してください。": "Your membership is restricted. Contact the community owner or a moderator.",
  "管理者": "Owner",
  "モデレーター": "Moderator",
  "モデレーターにする": "Make moderator",
  "モデレーターを解除": "Remove moderator",
  "参加制限中": "Membership restricted",
  "参加を復帰": "Restore membership",
  "メンバーを除外": "Remove member",
  "コミュニティに投稿": "Post to community",
  "コミュニティの投稿": "Community posts",
  "固定された投稿": "Pinned post",
  "投稿を固定": "Pin post",
  "固定を解除": "Unpin post",
  "投稿を削除": "Delete post",
  "コミュニティ名（1〜40文字）": "Community name (1–40 characters)",
  "メンバーを除外しますか？": "Remove this member?",
  "投稿を削除しますか？": "Delete this post?",
  "コミュニティを削除しますか？": "Delete this community?",
  "管理者またはモデレーターが復帰させるまで、このメンバーは参加・投稿できなくなります。": "This member cannot join or post until an owner or moderator restores their membership.",
  "この操作は取り消せません。": "This action cannot be undone.",
  "実行する": "Confirm",
  "更新": "Refresh",

  "公開": "Public",
  "非公開": "Private",
  "公開リスト": "Public list",
  "リストを公開": "Publish list",
  "非公開にする": "Make private",
  "公開ページを見る": "View public page",
  "共有リンク": "Share link",
  "共有リンクをコピー": "Copy share link",
  "コピーしました": "Copied",
  "共有リンクをコピーできませんでした。": "Could not copy the share link.",
  "公開リストを探す": "Discover public lists",
  "リスト名で検索": "Search by list name",
  "公開リストがありません。": "No public lists found.",
  "公開リストを読み込めませんでした。": "Could not load the public list.",
  "このリストは公開されていないか、削除されています。": "This list is private or has been deleted.",
  "公開するにはAppleかGoogleでログインしてください。": "Sign in with Apple or Google to publish lists.",
  "リストは初期状態では非公開です。公開すると共有リンクから誰でも閲覧できます。": "Lists are private by default. Publishing lets anyone view them using the share link.",

  "リスト": "Lists",
  "リストを作成": "Create list",
  "リストを編集": "Edit list",
  "リストを削除": "Delete list",
  "リストを削除しますか？": "Delete this list?",
  "リストとメンバー設定が削除されます。投稿は削除されません。": "The list and its membership settings will be deleted. Posts will remain.",
  "リスト名（1〜40文字）": "List name (1–40 characters)",
  "説明（160文字まで）": "Description (up to 160 characters)",
  "メンバー": "Members",
  "メンバー一覧": "Member list",
  "ユーザーを検索": "Search users",
  "ユーザー名・表示名": "Username or display name",
  "追加": "Add",
  "リストから削除": "Remove from list",
  "リストの投稿": "List posts",
  "まだリストがありません。": "No lists yet.",
  "ユーザーを追加すると投稿が表示されます。": "Add users to see their posts.",
  "リストはこの端末に保存されます。": "Lists are saved on this device.",
  "リストは自分だけに表示され、端末間で共有されます。": "Lists are private to you and synced across devices.",
  "リストが見つかりません。": "List not found.",
  "リストを読み込めませんでした。": "Could not load lists.",
  "リストを保存できませんでした。": "Could not save the list.",
  "リストを保存・読み込みできませんでした。": "Could not save or load lists.",
  "ユーザーを検索できませんでした。": "Could not search users.",
  "ユーザーが見つかりません。": "User not found.",
  "リスト名は1〜40文字、説明は160文字以内で入力してください。": "List names must contain 1–40 characters and descriptions at most 160 characters.",

    "ブックマークはアカウントに保存され、端末間で共有されます。": "Bookmarks are saved to your account and synced across devices.",
    "開発モードのブックマークはこの端末に保存されます。": "Development bookmarks are saved on this device.",
    "ブックマーク": "Bookmarks",
    "ブックマークに追加": "Save bookmark",
    "ブックマークを解除": "Remove bookmark",
    "ブックマークするにはログインしてください。": "Sign in to save bookmarks.",
    "ブックマークを保存できませんでした。": "Couldn't save the bookmark.",
    "ブックマークを読み込めませんでした。": "Couldn't load bookmarks.",
    "まだブックマークがありません。": "No bookmarks yet.",
    "ブックマークはこの端末に保存されます。": "Bookmarks are saved on this device.",
    "ボトムバー": "Bottom bar",
    "ボトムバーの文字を表示": "Show bottom bar labels",
    "1人があなたの投稿にいいねしました。": "1 person liked your post.",
    "{count}人があなたの投稿にいいねしました。": "{count} people liked your post.",
    "{name}さんがいいねしました。": "{name} liked your post.",
    "返信": "Replies",
    "返信する": "Reply",
    "返信本文": "Reply text",
    "返信先": "Replying to",
    "返信先の投稿": "View parent post",
    "返信するにはログインしてください。": "Sign in to reply.",
    "返信を保存できませんでした。": "Couldn't save your reply.",
    "返信は1〜70文字で入力してください。": "Replies must contain 1–70 characters.",
    "まだ返信がありません。": "No replies yet.",
    "送信中…": "Sending…",
    "PDFとして出力": "Export as PDF",
    "PDFを作成できませんでした。": "Could not create the PDF.",
    "通知": "Notifications",
    "未読の通知": "Unread notifications",
    "自分の投稿へのいいねをお知らせします。": "Likes on your posts appear here.",
    "通知を見るにはログインしてください。": "Sign in to view notifications.",
    "開発モードでは通知は届きません。": "Notifications are unavailable in development mode.",
    "通知を読み込めませんでした。": "Couldn't load notifications.",
    "通知を既読にできませんでした。": "Couldn't mark notifications as read.",
    "すべて既読にする": "Mark all as read",
    "まだ通知がありません。": "No notifications yet.",
    "さんがあなたの投稿にいいねしました。": "liked your post.",
    "もっと見る": "Load more",
    "ホーム": "Home",
    "投稿": "Posts",
    "自分": "Mine",
    "設定": "Settings",
    "あなた": "You",
    "ログイン": "Sign in",
    "閉じる": "Close",
    "いいね": "Like",
    "ライト": "Light",
    "ダーク": "Dark",
    "ダークブルー": "Dark blue",
    "ミント": "Mint",
    "システム": "System",
    "ふぁぼ": "Favorite",
    "デフォルト": "Default",
    "高評価": "Thumbs up",
    "賛成": "Upvote",
    "外観": "Appearance",
    "テーマ": "Theme",
    "言語": "Language",
    "日付表示": "Date display",
    "相対表示": "Relative",
    "月日と時刻": "Month/day and time",
    "年月日と時刻": "Full date and time",
    "今日": "Today",
    "いいねアイコン": "Like icon",
    "アイコン": "Icon",
    "システムを選ぶと端末の外観設定に合わせて切り替わります。": "System follows your device appearance.",
    "いいねの表示に使うアイコンを選べます。": "Choose the icon used for likes.",
    "イルカ": "Iruka",
    "今の気持ちを、70字まで。": "Share how you feel, in up to 70 characters.",
    "新しい投稿": "New post",
    "投稿する": "Post",
    "投稿を作成": "Create a post",
    "投稿本文": "Post text",
    "メインナビゲーション": "Main navigation",
    "いまどうしてる？": "What's happening?",
    "プロフィール": "Profile",
    "今週の投稿": "Posts this week",
    "プロフィールを見る・編集": "View or edit profile",
    "自分の投稿": "My posts",
    "ログインすると、この端末を超えて自分の投稿が見られます。": "Sign in to access your posts across devices.",
    "まだ投稿がありません": "No posts yet",
    "まだ投稿がありません。": "No posts yet.",
    "70字以内で、いまの気持ちを残しましょう。": "Share how you feel in up to 70 characters.",
    "ログアウト": "Sign out",
    "ログアウトしますか？": "Sign out?",
    "この端末からサインアウトします。もう一度ログインできます。": "You will be signed out on this device. You can sign in again anytime.",
    "ゲストでログイン": "Continue as guest",
    "アカウント登録なしで試せます。データはこの端末にだけ保存され、30日で削除されます。": "Try it without an account. Data stays on this device only and is deleted after 30 days.",
    "ゲスト": "Guest",
    "ゲストモードでは通知は届きません。": "Notifications are unavailable in guest mode.",
    "ゲストモードのブックマークはこの端末に保存されます。": "Guest bookmarks are saved on this device.",
    "プロフィールを見る": "View profile",
    "投稿時刻": "Posted at",
    "文字数": "Characters",
    "いいねを取り消す": "Unlike",
    "いいね数": "Like count",
    "読み込み中…": "Loading…",
    "プロフィールを編集": "Edit profile",
    "プロフィール編集": "Edit profile",
    "プロフィールが見つかりません。": "Profile not found.",
    "再読み込み": "Try again",
    "プロフィールを読み込めませんでした。": "Couldn't load the profile.",
    "表示名（1〜40文字）": "Display name (1–40 characters)",
    "表示名": "Display name",
    "ユーザー名（英数字と_、3〜25文字）": "Username (letters, numbers and _, 3–25 characters)",
    "ユーザー名": "Username",
    "自己紹介（160文字まで）": "Bio (up to 160 characters)",
    "プロフィール画像URL": "Profile image URL",
    "HTTPSの画像URL。空欄にすると画像を解除します。": "HTTPS image URL. Leave blank to remove the image.",
    "キャンセル": "Cancel",
    "保存中…": "Saving…",
    "保存": "Save",
    "保存する": "Save",
    "保存できませんでした。入力内容とユーザー名の重複を確認してください。": "Couldn't save. Check your details and whether the username is available.",
    "ログインしてはじめる": "Sign in to get started",
    "GoogleかAppleで入ると、自分の投稿が残ります。": "Sign in with Google or Apple to save your posts.",
    "Googleで続ける": "Continue with Google",
    "Appleで続ける": "Continue with Apple",
    "開発用にログインをスキップ": "Skip sign-in for development",
    "スキップ中のデータはこの端末内に保存されます。": "Development data is saved on this device.",
    "ログインできませんでした": "Couldn't sign in",
    "ログインに失敗しました": "Sign-in failed",
    "ログイン用のURLが不正です": "The sign-in URL is invalid.",
    "認証コードを受け取れませんでした": "Couldn't receive the authorization code.",
    "URLが不正です": "The URL is invalid.",
    "ログインが時間切れになりました": "Sign-in timed out.",
    "ログインをキャンセルしました": "Sign-in was cancelled.",
    "いいねするにはAppleかGoogleでログインしてください。": "Sign in with Apple or Google to like posts.",
    "いいねを保存できませんでした。もう一度試してください。": "Couldn't save your like. Please try again.",
    "投稿またはいいねを読み込めませんでした。": "Couldn't load posts or likes.",
    "ユーザー": "User",
    "表示名・ユーザー名・自己紹介・画像URLを確認してください。": "Check your display name, username, bio and image URL.",
    "開発ユーザーが一致しません。": "Development user does not match.",
    "プロフィールを保存できませんでした。": "Couldn't save the profile.",
    "ログイン情報が見つかりません。もう一度試してください。": "Sign-in details are missing. Please try again.",
    "ポップアップがブロックされました。許可してからもう一度試してください。": "The pop-up was blocked. Allow pop-ups and try again.",
    "投稿は1〜70文字で入力してください。": "Posts must contain 1–70 characters.",
    "投稿できませんでした": "Couldn't post.",
    "投稿が見つかりません。": "Post not found.",
    "いいねするにはログインしてください。": "Sign in to like posts.",
    "いいねを保存できませんでした。": "Couldn't save your like.",
    "表示名は1〜40文字で入力してください。": "Display names must contain 1–40 characters.",
    "ユーザー名は小文字の英数字と_で3〜25文字にしてください。": "Usernames must contain 3–25 lowercase letters, numbers or underscores.",
    "自己紹介は160文字以内で入力してください。": "Bios must be 160 characters or fewer.",
    "画像にはHTTPSのURLを指定してください。": "Use an HTTPS URL for the image.",
    "画像のURLを確認してください。": "Check the image URL.",
    "このユーザー名は既に使われています。": "This username is already taken.",
    "プロフィールを保存できませんでした。もう一度試してください。": "Couldn't save the profile. Please try again.",
    "ログインしています…": "Signing in…",
    "ログイン中…": "Signing in…",
    "タイムラインを読み込めませんでした。": "Couldn't load the timeline.",
    "投稿できませんでした。もう一度試してください。": "Couldn't post. Please try again.",
    "投稿するには、GoogleかAppleで入ってください。": "Sign in with Google or Apple to post.",
    "開発モード・このブラウザに保存": "Development mode · saved in this browser",
    "編集する": "Edit",
    "1〜40文字": "1–40 characters",
    "小文字の英数字と_、3〜25文字": "Lowercase letters, numbers and _, 3–25 characters",
    "自己紹介": "Bio",
    "保存できませんでした。": "Couldn't save.",
    "戻る": "Back",
    "今朝": "Today",
    "昨日": "Yesterday",
    "Oops! Page not found": "Page not found.",
    "Return to Home": "Return to Home",
    "文字": "characters",
    "字": "characters",
    "投稿数": "Post count",
    " 投稿": " posts",
    "文字まで": "characters maximum",
    "開発セッションではありません。": "Not a development session.",
    "ミュート": "Mute",
    "ミュートを解除": "Unmute",
    "ブロック": "Block",
    "ブロックを解除": "Unblock",
    "ミュート中": "Muted accounts",
    "ブロック中": "Blocked accounts",
    "解除": "Remove",
    "設定を読み込めませんでした。": "Could not load your settings.",
    "設定を保存できませんでした。": "Could not save your settings.",
    "アカウント": "Account",
    "メールアドレス": "Email",
    "ログインしていません。": "You are not signed in.",
    "未設定": "Not set",
    "アカウントを削除": "Delete account",
    "アカウントを削除しますか？": "Delete this account?",
    "投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。": "Your posts, profile, likes, bookmarks, and notifications will be deleted. This cannot be undone.",
    "削除中…": "Deleting…",
    "削除する": "Delete",
    "アカウントを削除できませんでした。": "Couldn't delete the account.",
    "Today": "今日",
    "Yesterday": "昨日"
]
private let koreanMessages: [String: String] = [
  "コミュニティ、メンバー情報、すべての投稿が削除されます。この操作は取り消せません。": "커뮤니티, 멤버 정보, 모든 게시물이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
  "コミュニティ": "커뮤니티", "誰でも閲覧・参加できます。投稿するには参加が必要です。": "누구나 보고 참여할 수 있습니다. 게시하려면 먼저 참여하세요.",
  "コミュニティを利用するにはAppleかGoogleでログインしてください。": "커뮤니티를 이용하려면 Apple 또는 Google로 로그인하세요.",
  "コミュニティを読み込めませんでした。": "커뮤니티를 불러오지 못했습니다.", "コミュニティの操作に失敗しました。再読み込みして参加状態を確認してください。": "작업을 완료하지 못했습니다. 새로고침하여 참여 상태를 확인하세요.",
  "コミュニティ名は1〜40文字、説明は160文字以内で入力してください。": "커뮤니티 이름은 1~40자, 설명은 160자 이내로 입력하세요.", "コミュニティを検索": "커뮤니티 검색", "参加中のみ": "참여 중인 커뮤니티만", "参加中": "참여 중",
  "コミュニティを作成": "커뮤니티 만들기", "コミュニティを編集": "커뮤니티 수정", "コミュニティを削除": "커뮤니티 삭제", "コミュニティがありません。": "커뮤니티가 없습니다.", "コミュニティが見つかりません。": "커뮤니티를 찾을 수 없습니다.",
  "参加する": "참여하기", "退出する": "나가기", "参加が制限されています。管理者またはモデレーターに確認してください。": "참여가 제한되었습니다. 소유자 또는 운영자에게 문의하세요.",
  "管理者": "소유자", "モデレーター": "운영자", "モデレーターにする": "운영자로 지정", "モデレーターを解除": "운영자 해제", "参加制限中": "참여 제한됨", "参加を復帰": "참여 복원", "メンバーを除外": "멤버 내보내기",
  "コミュニティに投稿": "커뮤니티에 게시", "コミュニティの投稿": "커뮤니티 게시물", "固定された投稿": "고정된 게시물", "投稿を固定": "게시물 고정", "固定を解除": "고정 해제", "投稿を削除": "게시물 삭제",
  "コミュニティ名（1〜40文字）": "커뮤니티 이름(1~40자)", "メンバーを除外しますか？": "이 멤버를 내보낼까요?", "投稿を削除しますか？": "이 게시물을 삭제할까요?", "コミュニティを削除しますか？": "이 커뮤니티를 삭제할까요?",
  "管理者またはモデレーターが復帰させるまで、このメンバーは参加・投稿できなくなります。": "소유자나 운영자가 복원할 때까지 이 멤버는 참여하거나 게시할 수 없습니다.", "この操作は取り消せません。": "이 작업은 되돌릴 수 없습니다.", "実行する": "확인", "更新": "새로고침",
  "公開": "공개", "非公開": "비공개", "公開リスト": "공개 리스트", "リストを公開": "리스트 공개", "非公開にする": "비공개로 전환", "公開ページを見る": "공개 페이지 보기", "共有リンク": "공유 링크", "共有リンクをコピー": "공유 링크 복사", "コピーしました": "복사했습니다", "共有リンクをコピーできませんでした。": "공유 링크를 복사하지 못했습니다.",
  "公開リストを探す": "공개 리스트 찾기", "リスト名で検索": "리스트 이름 검색", "公開リストがありません。": "공개 리스트가 없습니다.", "公開リストを読み込めませんでした。": "공개 리스트를 불러오지 못했습니다.", "このリストは公開されていないか、削除されています。": "이 리스트는 비공개이거나 삭제되었습니다.", "公開するにはAppleかGoogleでログインしてください。": "리스트를 공개하려면 Apple 또는 Google로 로그인하세요.", "リストは初期状態では非公開です。公開すると共有リンクから誰でも閲覧できます。": "리스트는 기본적으로 비공개입니다. 공개하면 공유 링크를 통해 누구나 볼 수 있습니다.",
  "リスト": "리스트", "リストを作成": "리스트 만들기", "リストを編集": "리스트 수정", "リストを削除": "리스트 삭제", "リストを削除しますか？": "이 리스트를 삭제할까요?", "リストとメンバー設定が削除されます。投稿は削除されません。": "리스트와 멤버 설정이 삭제됩니다. 게시물은 삭제되지 않습니다.", "リスト名（1〜40文字）": "리스트 이름(1~40자)", "説明（160文字まで）": "설명(최대 160자)",
  "メンバー": "멤버", "メンバー一覧": "멤버 목록", "ユーザーを検索": "사용자 검색", "ユーザー名・表示名": "사용자 이름 또는 표시 이름", "追加": "추가", "リストから削除": "리스트에서 삭제", "リストの投稿": "리스트 게시물", "まだリストがありません。": "아직 리스트가 없습니다.", "ユーザーを追加すると投稿が表示されます。": "사용자를 추가하면 게시물이 표시됩니다.", "リストはこの端末に保存されます。": "리스트는 이 기기에 저장됩니다.", "リストは自分だけに表示され、端末間で共有されます。": "리스트는 나만 볼 수 있으며 기기 간에 동기화됩니다.", "リストが見つかりません。": "리스트를 찾을 수 없습니다.", "リストを読み込めませんでした。": "리스트를 불러오지 못했습니다.", "リストを保存できませんでした。": "리스트를 저장하지 못했습니다.", "リストを保存・読み込みできませんでした。": "리스트를 저장하거나 불러오지 못했습니다.", "ユーザーを検索できませんでした。": "사용자를 검색하지 못했습니다.", "ユーザーが見つかりません。": "사용자를 찾을 수 없습니다.", "リスト名は1〜40文字、説明は160文字以内で入力してください。": "리스트 이름은 1~40자, 설명은 160자 이내로 입력하세요.",
  "ミュート": "뮤트", "ミュートを解除": "뮤트 해제", "ミュート中": "뮤트 중", "ブロック": "차단", "ブロックを解除": "차단 해제", "ブロック中": "차단 중", "ミュート・ブロック中のアカウント": "뮤트 및 차단한 계정", "登録されたアカウントはありません。": "등록된 계정이 없습니다.", "解除": "해제", "設定を読み込めませんでした。": "설정을 불러오지 못했습니다.", "設定を保存できませんでした。": "설정을 저장하지 못했습니다.", "自分をミュート・ブロックできません。": "자신을 뮤트하거나 차단할 수 없습니다.",
  "PDFとして出力": "PDF로 내보내기", "PDFを開けませんでした。": "PDF 미리보기를 열 수 없습니다.", "PDFを作成できませんでした。": "PDF를 만들지 못했습니다.", "返信": "답글", "返信する": "답글 달기", "返信本文": "답글 내용", "返信先": "답글 대상", "返信先の投稿": "원본 게시물 보기", "返信するにはログインしてください。": "답글을 달려면 로그인하세요.", "返信を保存できませんでした。": "답글을 저장하지 못했습니다.", "返信は1〜70文字で入力してください。": "답글은 1~70자로 입력하세요.", "まだ返信がありません。": "아직 답글이 없습니다.", "送信中…": "전송 중…",
  "{name}さんがいいねしました。": "{name}님이 게시물을 좋아합니다.", "1人があなたの投稿にいいねしました。": "1명이 회원님의 게시물을 좋아합니다.", "{count}人があなたの投稿にいいねしました。": "{count}명이 회원님의 게시물을 좋아합니다.", "通知": "알림", "未読の通知": "읽지 않은 알림", "自分の投稿へのいいねをお知らせします。": "내 게시물에 대한 좋아요가 여기에 표시됩니다.", "通知を見るにはログインしてください。": "알림을 보려면 로그인하세요.", "開発モードでは通知は届きません。": "개발 모드에서는 알림을 받을 수 없습니다.", "通知を読み込めませんでした。": "알림을 불러오지 못했습니다.", "通知を既読にできませんでした。": "알림을 읽음으로 표시하지 못했습니다.", "すべて既読にする": "모두 읽음으로 표시", "まだ通知がありません。": "아직 알림이 없습니다.", "さんがあなたの投稿にいいねしました。": "님이 회원님의 게시물을 좋아합니다.", "もっと見る": "더 보기",
  "ブックマークはアカウントに保存され、端末間で共有されます。": "북마크는 계정에 저장되며 기기 간에 동기화됩니다.", "開発モードのブックマークはこの端末に保存されます。": "개발 모드의 북마크는 이 기기에 저장됩니다.", "ブックマーク": "북마크", "ブックマークに追加": "북마크 추가", "ブックマークを解除": "북마크 해제", "ブックマークするにはログインしてください。": "북마크하려면 로그인하세요.", "ブックマークを保存できませんでした。": "북마크를 저장하지 못했습니다.", "ブックマークを読み込めませんでした。": "북마크를 불러오지 못했습니다.", "まだブックマークがありません。": "아직 북마크가 없습니다.", "ブックマークはこの端末に保存されます。": "북마크는 이 기기에 저장됩니다.",
  "ナビゲーション": "탐색", "サイドナビゲーション": "사이드 탐색", "左側サイドバー（デスクトップ）": "왼쪽 사이드바(데스크톱)", "ボトムバー（デスクトップ）": "하단 바(데스크톱)", "デスクトップでは左側サイドバーを使用します。モバイルではボトムバーを使用します。": "데스크톱에서는 왼쪽 사이드바를 사용하고 모바일에서는 하단 바를 사용합니다.", "ボトムバー": "하단 바", "ボトムバーの文字を表示": "하단 바 레이블 표시", "ホーム": "홈", "検索": "검색", "キーワードで投稿を検索": "키워드로 게시물 검색", "ユーザー名や本文のキーワードで投稿を探せます。": "사용자 이름이나 게시물 키워드로 검색할 수 있습니다.", "該当する投稿がありません。": "검색 결과가 없습니다.", "投稿": "게시물", "自分": "내 활동", "設定": "설정", "あなた": "나", "あ": "나", "ログイン": "로그인", "閉じる": "닫기", "いいね": "좋아요", "ライト": "라이트", "ダーク": "다크", "ダークブルー": "다크 블루", "ミント": "민트", "システム": "시스템", "ふぁぼ": "즐겨찾기", "デフォルト": "기본값", "高評価": "추천", "賛成": "찬성", "外観": "모양", "テーマ": "테마", "言語": "언어", "いいねアイコン": "좋아요 아이콘", "アイコン": "아이콘", "システムを選ぶと端末の外観設定に合わせて切り替わります。": "시스템을 선택하면 기기의 모양 설정에 따라 전환됩니다.", "いいねの表示に使うアイコンを選べます。": "좋아요 표시 아이콘을 선택할 수 있습니다.", "イルカ": "돌고래",
  "今の気持ちを、70字まで。": "지금 기분을 70자 이내로 남겨보세요.", "新しい投稿": "새 게시물", "投稿する": "게시", "投稿を作成": "게시물 작성", "投稿本文": "게시물 내용", "メインナビゲーション": "주요 탐색", "いまどうしてる？": "지금 무슨 생각을 하고 있나요?", "プロフィール": "프로필", "今週の投稿": "이번 주 게시물", "プロフィールを見る・編集": "프로필 보기 및 수정", "自分の投稿": "내 게시물", "ログインすると、この端末を超えて自分の投稿が見られます。": "로그인하면 여러 기기에서 내 게시물을 볼 수 있습니다.", "まだ投稿がありません": "아직 게시물이 없습니다", "まだ投稿がありません。": "아직 게시물이 없습니다.", "70字以内で、いまの気持ちを残しましょう。": "지금 기분을 70자 이내로 남겨보세요.", "ログアウト": "로그아웃", "ログアウトしますか？": "로그아웃할까요?", "この端末からサインアウトします。もう一度ログインできます。": "이 기기에서 로그아웃합니다. 언제든 다시 로그인할 수 있습니다.", "ゲストでログイン": "게스트로 계속", "アカウント登録なしで試せます。データはこの端末にだけ保存され、30日で削除されます。": "계정 없이 사용해 보세요. 데이터는 이 기기에만 저장되며 30일 후 삭제됩니다.", "ゲスト": "게스트", "ゲストモード・このブラウザに保存": "게스트 모드 · 이 브라우저에 저장", "ゲストモードのブックマークはこの端末に保存されます。": "게스트 모드의 북마크는 이 기기에 저장됩니다.", "ゲストモードでは通知は届きません。": "게스트 모드에서는 알림을 받을 수 없습니다.", "ゲストの投稿を新しいアカウントに引き継ぎました": "게스트 게시물을 새 계정으로 옮겼습니다.", "ゲストのデータは保持期限（30日）を過ぎたため、削除されました。": "게스트 데이터는 30일 보관 기간이 지나 삭제되었습니다.", "プロフィールを見る": "프로필 보기", "投稿時刻": "게시 시간", "文字数": "글자 수", "いいねを取り消す": "좋아요 취소", "いいね数": "좋아요 수", "読み込み中…": "불러오는 중…", "プロフィールを編集": "프로필 수정", "プロフィール編集": "프로필 수정", "プロフィールが見つかりません。": "프로필을 찾을 수 없습니다.", "再読み込み": "다시 시도", "プロフィールを読み込めませんでした。": "프로필을 불러오지 못했습니다.", "表示名（1〜40文字）": "표시 이름(1~40자)", "表示名": "표시 이름", "ユーザー名（英数字と_、3〜25文字）": "사용자 이름(영문자, 숫자, _, 3~25자)", "ユーザー名": "사용자 이름", "自己紹介（160文字まで）": "소개(최대 160자)", "プロフィール画像URL": "프로필 이미지 URL", "プロフィール画像": "프로필 이미지", "画像を変更": "이미지 변경", "画像を削除": "이미지 삭제", "アップロード中…": "업로드 중…", "画像をアップロードできませんでした。": "이미지를 업로드하지 못했습니다.", "画像ファイルを選んでください。": "이미지 파일을 선택하세요.", "画像は10MBまでです。": "이미지는 최대 10MB까지 가능합니다.", "JPEGやPNGの画像を登録できます。": "JPEG 또는 PNG 이미지를 업로드할 수 있습니다.", "HTTPSの画像URL。空欄にすると画像を解除します。": "HTTPS 이미지 URL입니다. 비워 두면 이미지를 제거합니다.", "キャンセル": "취소", "保存中…": "저장 중…", "保存": "저장", "保存する": "저장", "保存できませんでした。入力内容とユーザー名の重複を確認してください。": "저장하지 못했습니다. 입력 내용과 사용자 이름 중복 여부를 확인하세요.", "ログインしてはじめる": "로그인하고 시작하기", "GoogleかAppleで入ると、自分の投稿が残ります。": "Google 또는 Apple로 로그인하면 게시물이 저장됩니다.", "Googleで続ける": "Google로 계속", "Appleで続ける": "Apple로 계속", "開発用にログインをスキップ": "개발용 로그인 건너뛰기", "スキップ中のデータはこの端末内に保存されます。": "개발 데이터는 이 기기에 저장됩니다.", "ログインできませんでした": "로그인하지 못했습니다", "ログインに失敗しました": "로그인에 실패했습니다", "ログイン用のURLが不正です": "로그인 URL이 올바르지 않습니다.", "認証コードを受け取れませんでした": "인증 코드를 받지 못했습니다.", "URLが不正です": "URL이 올바르지 않습니다.", "ログインが時間切れになりました": "로그인 시간이 초과되었습니다.", "ログインをキャンセルしました": "로그인을 취소했습니다.", "いいねするにはAppleかGoogleでログインしてください。": "좋아요를 누르려면 Apple 또는 Google로 로그인하세요.", "いいねを保存できませんでした。もう一度試してください。": "좋아요를 저장하지 못했습니다. 다시 시도하세요.", "投稿またはいいねを読み込めませんでした。": "게시물이나 좋아요를 불러오지 못했습니다.", "ユーザー": "사용자", "表示名・ユーザー名・自己紹介・画像URLを確認してください。": "표시 이름, 사용자 이름, 소개, 이미지 URL을 확인하세요.", "開発ユーザーが一致しません。": "개발 사용자 정보가 일치하지 않습니다.", "プロフィールを保存できませんでした。": "프로필을 저장하지 못했습니다.", "ログイン情報が見つかりません。もう一度試してください。": "로그인 정보를 찾을 수 없습니다. 다시 시도하세요.", "ポップアップがブロックされました。許可してからもう一度試してください。": "팝업이 차단되었습니다. 허용한 후 다시 시도하세요.", "投稿は1〜70文字で入力してください。": "게시물은 1~70자로 입력하세요.", "投稿できませんでした": "게시하지 못했습니다.", "投稿が見つかりません。": "게시물을 찾을 수 없습니다.", "いいねするにはログインしてください。": "좋아요를 누르려면 로그인하세요.", "いいねを保存できませんでした。": "좋아요를 저장하지 못했습니다.", "表示名は1〜40文字で入力してください。": "표시 이름은 1~40자로 입력하세요.", "ユーザー名は小文字の英数字と_で3〜25文字にしてください。": "사용자 이름은 소문자 영문자, 숫자, _로 3~25자여야 합니다.", "自己紹介は160文字以内で入力してください。": "소개는 160자 이내로 입력하세요.", "画像にはHTTPSのURLを指定してください。": "이미지에는 HTTPS URL을 사용하세요.", "画像のURLを確認してください。": "이미지 URL을 확인하세요.", "このユーザー名は既に使われています。": "이미 사용 중인 사용자 이름입니다.", "プロフィールを保存できませんでした。もう一度試してください。": "프로필을 저장하지 못했습니다. 다시 시도하세요.", "ログインしています…": "로그인 중…", "ログイン中…": "로그인 중…", "タイムラインを読み込めませんでした。": "타임라인을 불러오지 못했습니다.", "投稿できませんでした。もう一度試してください。": "게시하지 못했습니다. 다시 시도하세요.", "投稿するには、GoogleかAppleで入ってください。": "게시하려면 Google 또는 Apple로 로그인하세요.", "開発モード・このブラウザに保存": "개발 모드 · 이 브라우저에 저장", "編集する": "수정", "1〜40文字": "1~40자", "小文字の英数字と_、3〜25文字": "소문자 영문자, 숫자, _, 3~25자", "3〜25文字": "3~25자", "小文字の英数字と_": "소문자 영문자, 숫자, _", "確認中…": "확인 중…", "利用できるユーザー名です。": "사용할 수 있는 사용자 이름입니다.", "自己紹介": "소개", "保存できませんでした。": "저장하지 못했습니다.", "戻る": "뒤로", "今朝": "오늘", "昨日": "어제", "Oops! Page not found": "페이지를 찾을 수 없습니다.", "Return to Home": "홈으로 돌아가기", "文字": "자", "字": "자", "投稿数": "게시물 수", " 投稿": "개 게시물", "文字まで": "자까지", "開発セッションではありません。": "개발 세션이 아닙니다.", "アカウント": "계정", "メールアドレス": "이메일 주소", "ログインしていません。": "로그인되어 있지 않습니다.", "未設定": "설정되지 않음", "アカウントを削除": "계정 삭제", "アカウントを削除しますか？": "계정을 삭제할까요?", "投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。": "게시물, 프로필, 좋아요, 북마크, 알림이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.", "削除中…": "삭제 중…", "削除する": "삭제", "アカウントを削除できませんでした。": "계정을 삭제하지 못했습니다.", "Today": "오늘", "Yesterday": "어제"
]
private let koreanDateMessages: [String: String] = [
    "日付表示": "날짜 표시",
    "相対表示": "상대 표시",
    "月日と時刻": "월일 및 시간",
    "年月日と時刻": "전체 날짜 및 시간",
    "今日": "오늘",
]
private let japaneseFormats: [String: String] = ["character_count": "%d字、上限%d字", "characters": "%d字", "like_count": "%d件", "post_count": "%d 投稿", "today_time": "今朝 %@", "yesterday_time": "昨日 %@"]
private let englishFormats: [String: String] = ["character_count": "%d characters, maximum %d", "characters": "%d characters", "like_count": "%d likes", "post_count": "%d posts", "today_time": "Today %@", "yesterday_time": "Yesterday %@"]
private let koreanFormats: [String: String] = ["character_count": "최대 %d자 중 %d자", "characters": "%d자", "like_count": "좋아요 %d개", "post_count": "게시물 %d개", "today_time": "오늘 %@", "yesterday_time": "어제 %@"]

func L(_ message: String, _ arguments: CVarArg...) -> String {
    let language = AppLanguage.current
    let translated: String
    let formats = language == .en ? englishFormats : language == .ko ? koreanFormats : japaneseFormats
    if let format = formats[message] {
        translated = format
    } else if language == .ko {
        if message.hasPrefix("ログインに失敗しました（") {
            translated = message.replacingOccurrences(of: "ログインに失敗しました（", with: "로그인 실패(").replacingOccurrences(of: "）", with: ")")
        } else {
            translated = koreanMessages[message] ?? koreanDateMessages[message] ?? englishMessages[message] ?? message
        }
    } else if language == .en {
        if message.hasPrefix("ログインに失敗しました（") {
            translated = message.replacingOccurrences(of: "ログインに失敗しました（", with: "Sign-in failed (").replacingOccurrences(of: "）", with: ")")
        } else {
            translated = englishMessages[message] ?? message
        }
    } else {
        translated = message
    }
    return arguments.isEmpty ? translated : String(format: translated, locale: AppLanguage.locale, arguments: arguments)
}

struct AppLanguageModifier: ViewModifier {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    func body(content: Content) -> some View {
        content.environment(\.locale, Locale(identifier: language))
    }
}
