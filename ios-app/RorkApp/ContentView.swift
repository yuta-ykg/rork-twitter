import SwiftUI

struct ContentView: View {
    @AppStorage("iruka-bottom-bar-labels") private var showBottomBarLabels = false
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.irukaPalette) private var palette
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var bookmarks = BookmarkStore()
    @Environment(\.scenePhase) private var scenePhase
    @State private var showsComposer = false
    @State private var showsSignIn = false
    @State private var selectedTab: MainTab = .home
    @State private var composeAfterLogin = false

    private enum MainTab: Hashable { case home, compose, mine, bookmarks, settings }

    var body: some View {
        TabView(selection: Binding(get: { selectedTab }, set: selectTab)) {
            Tab(L("ホーム"), systemImage: "house.fill", value: MainTab.home) {
                NavigationStack {
                    HomeView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
            Tab(L("投稿"), systemImage: "square.and.pencil", value: MainTab.compose) {
                Color.clear
            }
            Tab(L("自分"), systemImage: "person.fill", value: MainTab.mine) {
                NavigationStack {
                    MineView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
            Tab(L("ブックマーク"), systemImage: "bookmark.fill", value: MainTab.bookmarks) {
                NavigationStack {
                    BookmarksView(store: store)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
            Tab(L("設定"), systemImage: "gearshape", value: MainTab.settings) {
                NavigationStack { SettingsView() }
            }
        }
        .toolbarBackground(palette.background, for: .tabBar)
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            HStack(spacing: 0) {
                bottomBarButton(.home, title: "ホーム", symbol: "house.fill")
                bottomBarButton(.compose, title: "投稿", symbol: "square.and.pencil")
                bottomBarButton(.mine, title: "自分", symbol: "person.fill")
                bottomBarButton(.bookmarks, title: "ブックマーク", symbol: "bookmark.fill")
                bottomBarButton(.settings, title: "設定", symbol: "gearshape")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .background(.bar)
        }
        .tint(palette.blue)
        .task(id: auth.user?.id) {
            bookmarks.configure(userId: auth.user?.id)
            await bookmarks.refresh()
            if let user = auth.user {
                await store.syncProfile(user)
            }
            await store.refresh(userId: auth.user?.id)
        }
        .sheet(isPresented: $showsComposer) {
            ComposeSheet(
                authorName: auth.user?.displayName ?? "あなた",
                handle: auth.user?.handle ?? "@you",
                initial: auth.user?.initial ?? "あ"
            ) { body in
                guard let user = auth.user else { return }
                store.add(body: body, user: user)
            }
        }
        .sheet(isPresented: $showsSignIn, onDismiss: {
            if composeAfterLogin && auth.user != nil { showsComposer = true }
            composeAfterLogin = false
        }) {
            NavigationStack {
                SignInView()
                    .navigationTitle(L("ログイン"))
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(L("閉じる")) { showsSignIn = false }
                        }
                    }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .alert(L("いいね"), isPresented: Binding(
            get: { store.likeError != nil },
            set: { if !$0 { store.likeError = nil } }
        )) {
            Button("OK") { store.likeError = nil }
        } message: {
            Text(L(store.likeError ?? ""))
        }
        .alert(L("ブックマーク"), isPresented: Binding(
            get: { bookmarks.error != nil },
            set: { if !$0 { bookmarks.error = nil } }
        )) {
            Button("OK") { bookmarks.error = nil }
        } message: { Text(L(bookmarks.error ?? "")) }
        .environment(bookmarks)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await bookmarks.refresh() } }
        }
        .onChange(of: auth.user?.id) { _, newValue in
            bookmarks.configure(userId: newValue)
            if newValue != nil {
                showsSignIn = false
            }
        }
    }
    private func selectTab(_ tab: MainTab) {
        if tab == .compose {
            if auth.user == nil {
                composeAfterLogin = true
                showsSignIn = true
            } else { showsComposer = true }
        } else { selectedTab = tab }
    }

    private func bottomBarButton(_ tab: MainTab, title: String, symbol: String) -> some View {
        Button { selectTab(tab) } label: {
            VStack(spacing: 3) {
                Image(systemName: symbol).font(.system(size: 20))
                if showBottomBarLabels { Text(L(title)).font(.caption2).lineLimit(1) }
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedTab == tab || tab == .compose ? palette.blue : palette.secondary)
        .accessibilityLabel(L(title))
        .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
    }

}

#Preview {
    ContentView()
        .environment(AuthManager())

}
