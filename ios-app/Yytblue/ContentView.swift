import SwiftUI

struct ContentView: View {
    @AppStorage("iruka-bottom-bar-labels") private var showBottomBarLabels = false
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var lists = UserListStore()
    @State private var bookmarks = BookmarkStore()
    @State private var notifications = NotificationStore()
    @State private var relationships = RelationshipStore.shared
    @Environment(\.scenePhase) private var scenePhase
    @State private var showsComposer = false
    @State private var showsSignIn = false
    @State private var selectedTab: MainTab = .home
    @State private var composeAfterLogin = false

    private enum MainTab: Hashable { case home, compose, mine, bookmarks, notifications, lists, settings }

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if auth.user == nil {
                // ログインしていないときはアプリの内容を見せない。
                NavigationStack { SignInView() }
            } else {
                mainTabs
            }
        }
        .tint(Color.irukaBlue)
        .task(id: auth.user?.id) {
            bookmarks.configure(userId: auth.user?.id)
            relationships.configure(userId: auth.user?.id)
            await relationships.refresh()
            await bookmarks.refresh()
            if let user = auth.user {
                await store.syncProfile(user)
            }
            await store.refresh(userId: auth.user?.id)
        }
        .alert(L("投稿"), isPresented: Binding(
            get: { store.composeError != nil },
            set: { if !$0 { store.composeError = nil } }
        )) {
            Button("OK") { store.composeError = nil }
        } message: { Text(L(store.composeError ?? "")) }
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
        .environment(store)
        .environment(notifications)
        .task(id: auth.user?.id) {
            notifications.configure(userId: auth.user?.id)
            guard auth.user != nil, !DevelopmentData.isActive else { return }
            while !Task.isCancelled {
                if scenePhase == .active { await notifications.refresh() }
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
            }
        }
        .alert(L("通知"), isPresented: Binding(
            get: { notifications.readError != nil },
            set: { if !$0 { notifications.readError = nil } }
        )) { Button("OK") { notifications.readError = nil } }
        message: { Text(L(notifications.readError ?? "")) }
        .environment(lists)
        .task(id: auth.user?.id) {
            lists.configure(userId: auth.user?.id)
            await lists.refresh()
        }
        .environment(bookmarks)
        .environment(relationships)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await relationships.refresh(); await store.refresh(userId: auth.user?.id); await bookmarks.refresh(); await notifications.refresh(); await lists.refresh() } }
        }
        .onChange(of: auth.user?.id) { _, newValue in
            lists.configure(userId: newValue)
            bookmarks.configure(userId: newValue)
            relationships.configure(userId: newValue)
            notifications.configure(userId: newValue)
            if newValue != nil {
                showsSignIn = false
            }
        }
    }

    private var mainTabs: some View {
        TabView(selection: Binding(get: { selectedTab }, set: selectTab)) {
            Tab(L("ホーム"), systemImage: "house.fill", value: MainTab.home) {
                NavigationStack {
                    HomeView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn, onSelectTab: { destination in
                        switch destination {
                        case "compose": selectTab(.compose)
                        case "mine": selectTab(.mine)
                        case "bookmarks": selectTab(.bookmarks)
                        case "notifications": selectTab(.notifications)
                        default: selectTab(.home)
                        }
                    })
                        .navigationDestination(isPresented: composerVisible(.home)) { ComposeView() }
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                        .navigationDestination(for: ProfileRoute.self) { route in
                            ProfileView(profileId: route.id, store: store)
                        }
                }
            }
            Tab(L("投稿"), systemImage: "square.and.pencil", value: MainTab.compose) {
                Color.clear
            }
            Tab(L("自分"), systemImage: "person.fill", value: MainTab.mine) {
                NavigationStack {
                    MineView(store: store, showsSignIn: $showsSignIn)
                        .navigationDestination(isPresented: composerVisible(.mine)) { ComposeView() }
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                        .navigationDestination(for: ProfileRoute.self) { route in
                            ProfileView(profileId: route.id, store: store)
                        }
                }
            }
            Tab(L("ブックマーク"), systemImage: "bookmark.fill", value: MainTab.bookmarks) {
                NavigationStack {
                    BookmarksView(store: store)
                        .navigationDestination(isPresented: composerVisible(.bookmarks)) { ComposeView() }
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                        .navigationDestination(for: ProfileRoute.self) { route in
                            ProfileView(profileId: route.id, store: store)
                        }
                }
            }
            Tab(L("通知"), systemImage: "bell.fill", value: MainTab.notifications) {
                NavigationStack {
                    NotificationsView(store: store)
                        .navigationDestination(isPresented: composerVisible(.notifications)) { ComposeView() }
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                        .navigationDestination(for: ProfileRoute.self) { route in
                            ProfileView(profileId: route.id, store: store)
                        }
                }
            }
            Tab(L("リスト"), systemImage: "list.bullet.rectangle", value: MainTab.lists) {
                NavigationStack {
                    UserListsView(store: store)
                        .navigationDestination(isPresented: composerVisible(.lists)) { ComposeView() }
                        .navigationDestination(for: Post.self) { post in PostDetailView(initialPost: post, store: store) }
                        .navigationDestination(for: ProfileRoute.self) { route in ProfileView(profileId: route.id, store: store) }
                }
            }
            Tab(L("設定"), systemImage: "gearshape", value: MainTab.settings) {
                NavigationStack {
                    SettingsView()
                        .navigationDestination(isPresented: composerVisible(.settings)) { ComposeView() }
                }
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            HStack(spacing: 0) {
                bottomBarButton(.home, title: "ホーム", symbol: "house.fill")
                bottomBarButton(.compose, title: "投稿", symbol: "square.and.pencil")
                bottomBarButton(.mine, title: "自分", symbol: "person.fill")
                bottomBarButton(.bookmarks, title: "ブックマーク", symbol: "bookmark.fill")
                bottomBarButton(.notifications, title: "通知", symbol: "bell.fill")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .background(.bar)
        }
    }

    /// ComposeViewのpush状態。選択中のタブのスタックだけが反応し、タブを切り替えると閉じる。
    private func composerVisible(_ tab: MainTab) -> Binding<Bool> {
        Binding(
            get: { showsComposer && selectedTab == tab },
            set: { showsComposer = $0 }
        )
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
                    .overlay(alignment: .topTrailing) {
                        if tab == .notifications && notifications.unreadCount > 0 {
                            Text(notifications.unreadCount > 99 ? "99+" : String(notifications.unreadCount))
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 3).background(.red, in: Capsule())
                                .offset(x: 10, y: -7).accessibilityHidden(true)
                        }
                    }
                if showBottomBarLabels { Text(L(title)).font(.caption2).lineLimit(1) }
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedTab == tab || tab == .compose ? Color.irukaBlue : Color.irukaSecondary)
        .accessibilityLabel(L(title))
        .accessibilityValue(tab == .notifications && notifications.unreadCount > 0 ? L("未読の通知") + ": " + String(notifications.unreadCount) : "")
        .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
    }
}

#Preview {
    ContentView()
        .environment(AuthManager())
}
