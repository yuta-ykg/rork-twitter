import SwiftUI

struct HomeView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-timeline-mode") private var timelineMode = "recommended"
    @Environment(AuthManager.self) private var auth
    @Environment(BookmarkStore.self) private var bookmarks
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool
    var onSelectTab: (String) -> Void
    @State private var showsSidebar = false

    var body: some View {
        List {
            Section {
                Button {
                    if auth.user == nil { showsSignIn = true } else { showsComposer = true }
                } label: {
                    HStack(spacing: 12) {
                        Text(auth.user?.initial ?? "い")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.irukaInk.opacity(0.7))
                            .frame(width: 36, height: 36)
                            .background(Color.irukaBlue.opacity(0.12), in: Circle())
                        Text(L("いまどうしてる？"))
                            .font(.system(size: 17))
                            .foregroundStyle(Color.irukaSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
            }

            Section {
                Picker(L("タイムラインの表示順"), selection: $timelineMode) {
                    Text(L("おすすめ")).tag("recommended")
                    Text(L("新着順")).tag("latest")
                }
                .pickerStyle(.segmented)
                if timelineMode == "recommended" {
                    Text(L("いいね・ブックマーク・自分の投稿を手がかりに、話題の近い投稿を優先します。"))
                        .font(.caption)
                        .foregroundStyle(Color.irukaSecondary)
                }
            }
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))

            ForEach(timeline) { post in
                VStack(alignment: .leading, spacing: 0) {
                    PostRowView(post: post)
                    HStack(spacing: 8) {
                        LikeButton(post: post) { store.toggleLike(id: post.id) }
                        BookmarkButton(postId: post.id)
                    }
                        .padding(.leading, 58)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Color.white)
        .overlay {
            if showsSidebar {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Color.black.opacity(0.35)
                            .ignoresSafeArea()
                            .onTapGesture(perform: closeSidebar)
                            .accessibilityHidden(true)
                        sidebar
                            .frame(width: min(320, geometry.size.width * 0.86))
                            .frame(maxHeight: .infinity, alignment: .top)
                            .transition(.move(edge: .leading))
                    }
                    .frame(width: geometry.size.width, height: geometry.size.height, alignment: .leading)
                }
                .transition(.opacity)
                .zIndex(1)
            }
        }
        .animation(.easeInOut(duration: 0.22), value: showsSidebar)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                HStack(spacing: 12) {
                    Button {
                        withAnimation { showsSidebar = true }
                    } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 18, weight: .medium))
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(L("メニューを開く"))
                    .accessibilityHint(L("メニュー"))
                    Wordmark()
                }
            }
        }

    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L("メニュー"))
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(Color.irukaInk)
                Spacer()
                Button(action: closeSidebar) {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L("メニューを閉じる"))
            }
            .padding(.horizontal, 4)

            Divider()

            ScrollView {
                VStack(spacing: 4) {
                    sidebarTab(title: "ホーム", symbol: "house.fill", selected: true) { onSelectTab("home") }
                    sidebarTab(title: "投稿", symbol: "square.and.pencil") { onSelectTab("compose") }
                    sidebarTab(title: "自分", symbol: "person.fill") { onSelectTab("mine") }
                    sidebarTab(title: "ブックマーク", symbol: "bookmark.fill") { onSelectTab("bookmarks") }
                    sidebarTab(title: "通知", symbol: "bell.fill") { onSelectTab("notifications") }

                    Divider().padding(.vertical, 8)

                    sidebarLink(title: "リスト", symbol: "list.bullet.rectangle") {
                        UserListsView(store: store)
                    }
                    sidebarLink(title: "コミュニティ", symbol: "person.3") {
                        CommunitiesView()
                    }
                    sidebarLink(title: "診断を探す", symbol: "sparkles") {
                        DiagnosisLibraryView(store: store)
                    }
                    sidebarLink(title: "ゲームセンター", symbol: "gamecontroller") {
                        GamesView(store: store, showsSignIn: $showsSignIn)
                    }
                    sidebarLink(title: "ランキング", symbol: "chart.bar") {
                        RankingsView(store: store)
                    }
                    sidebarLink(title: "設定", symbol: "gearshape") {
                        SettingsView()
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.white)
        .shadow(color: .black.opacity(0.18), radius: 14, x: 5, y: 0)
    }

    private func sidebarTab(title: String, symbol: String, selected: Bool = false, action: @escaping () -> Void) -> some View {
        Button {
            closeSidebar()
            action()
        } label: {
            Label(L(title), systemImage: symbol)
                .font(.system(size: 16, weight: selected ? .semibold : .regular))
                .foregroundStyle(selected ? Color.irukaBlue : Color.irukaInk)
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                .padding(.horizontal, 12)
                .background(selected ? Color.irukaBlue.opacity(0.1) : .clear, in: RoundedRectangle(cornerRadius: 12))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func sidebarLink<Destination: View>(title: String, symbol: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink {
            destination()
        } label: {
            Label(L(title), systemImage: symbol)
                .font(.system(size: 16))
                .foregroundStyle(Color.irukaInk)
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                .padding(.horizontal, 12)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .simultaneousGesture(TapGesture().onEnded { closeSidebar() })
    }

    private func closeSidebar() {
        withAnimation { showsSidebar = false }
    }

    private var timeline: [Post] {
        guard timelineMode != "latest" else { return store.timeline }
        return TimelineRecommender.rank(posts: store.posts, bookmarkedIds: Set(bookmarks.ids))
    }

}

struct MineView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool

    var body: some View {
        List {
            Section {
                VStack(spacing: 4) {
                    Text("\(store.thisWeekCount)")
                        .font(.system(size: 56, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .monospacedDigit()
                    Text(L("今週の投稿"))
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowSeparator(.hidden)
            }

            if let user = auth.user {
                Section {
                    NavigationLink(L("プロフィールを見る・編集")) {
                        ProfileView(profileId: user.id, store: store)
                    }
                }
            }

            if auth.user == nil {
                SignInView(title: L("自分の投稿"), message: L("ログインすると、この端末を超えて自分の投稿が見られます。"))
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            } else if store.mine.isEmpty {
                ContentUnavailableView(L("まだ投稿がありません"), systemImage: "fish", description: Text(L("70字以内で、いまの気持ちを残しましょう。")))
                    .listRowSeparator(.hidden)
            } else {
                ForEach(store.mine) { post in
                    VStack(alignment: .leading, spacing: 0) {
                        PostRowView(post: post, showsAuthor: false)
                        HStack(spacing: 8) {
                        LikeButton(post: post) { store.toggleLike(id: post.id) }
                        BookmarkButton(postId: post.id)
                    }
                            .padding(.leading, 58)
                    }
                    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Color.white)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Wordmark()
            }
            if auth.user != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(L("ログアウト")) {
                        Task { await auth.signOut() }
                    }
                }
            }
        }

    }
}
