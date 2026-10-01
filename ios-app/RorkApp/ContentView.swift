import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var showsComposer = false
    @State private var showsSignIn = false

    var body: some View {
        TabView {
            Tab("ホーム", systemImage: "house.fill") {
                NavigationStack {
                    HomeView(store: store, showsComposer: $showsComposer, showsSignIn: $showsSignIn)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(initialPost: post, store: store)
                        }
                }
            }
            Tab("自分", systemImage: "person.fill") {
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
        .sheet(isPresented: $showsSignIn) {
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
