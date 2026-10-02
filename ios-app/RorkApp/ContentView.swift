import SwiftUI

struct ContentView: View {
    @AppStorage("iruka-bottom-bar-labels") private var showBottomBarLabels = false
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.irukaPalette) private var palette
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var bookmarks = BookmarkStore()
    @State private var notifications = NotificationStore()
    @State private var relationships = RelationshipStore.shared
    @Environment(\.scenePhase) private var scenePhase
    @State private var showsComposer = false
    @State private var showsSignIn = false
    @State private var selectedTab: MainTab = .home
    @State private var composeAfterLogin = false

    private enum MainTab: Hashable { case home, compose, mine, bookmarks, notifications, settings }

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
            Tab(L("通知"), systemImage: "bell.fill", value: MainTab.notifications) {
                NavigationStack { NotificationsView(store: store) }
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
                bottomBarButton(.notifications, title: "通知", symbol: "bell.fill")
                bottomBarButton(.settings, title: "設定", symbol: "gearshape")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .background(.bar)
        }
        .tint(palette.blue)
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
        .environment(bookmarks)
        .environment(relationships)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await relationships.refresh(); await store.refresh(userId: auth.user?.id); await bookmarks.refresh(); await notifications.refresh() } }
        }
        .onChange(of: auth.user?.id) { _, newValue in
            bookmarks.configure(userId: newValue)
            relationships.configure(userId: newValue)
            notifications.configure(userId: newValue)
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
        .foregroundStyle(selectedTab == tab || tab == .compose ? palette.blue : palette.secondary)
        .accessibilityLabel(L(title))
        .accessibilityValue(tab == .notifications && notifications.unreadCount > 0 ? L("未読の通知") + ": " + String(notifications.unreadCount) : "")
        .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
    }

}

#Preview {
    ContentView()
        .environment(AuthManager())

}

