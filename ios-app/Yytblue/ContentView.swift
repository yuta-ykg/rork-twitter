import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var showsComposer = false
    @State private var showsSignIn = false
    @State private var selectedTab: MainTab = .home
    @State private var composeAfterLogin = false

    private enum MainTab: Hashable { case home, compose, mine }

    var body: some View {
        TabView(selection: Binding(
            get: { selectedTab },
            set: { tab in
                if tab == .compose {
                    if auth.user == nil {
                        composeAfterLogin = true
                        showsSignIn = true
                    } else { showsComposer = true }
                } else { selectedTab = tab }
            }
        )) {
            Tab("ホーム", systemImage: "house.fill", value: MainTab.home) {
                NavigationStack {
                    HomeView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
            Tab("投稿", systemImage: "square.and.pencil", value: MainTab.compose) {
                Color.clear
            }
            Tab("自分", systemImage: "person.fill", value: MainTab.mine) {
                NavigationStack {
                    MineView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
        }
        .tint(Color.irukaBlue)
        .task(id: auth.user?.id) {
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
                    .navigationTitle("ログイン")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("閉じる") { showsSignIn = false }
                        }
                    }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .alert("いいね", isPresented: Binding(
            get: { store.likeError != nil },
            set: { if !$0 { store.likeError = nil } }
        )) {
            Button("OK") { store.likeError = nil }
        } message: {
            Text(store.likeError ?? "")
        }
        .onChange(of: auth.user?.id) { _, newValue in
            if newValue != nil {
                showsSignIn = false
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthManager())
}
