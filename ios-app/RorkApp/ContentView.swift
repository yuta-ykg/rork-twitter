import SwiftUI

struct ContentView: View {
    @State private var store = PostStore()
    @State private var showsComposer = false

    var body: some View {
        TabView {
            Tab("ホーム", systemImage: "house.fill") {
                NavigationStack {
                    HomeView(store: store, showsComposer: $showsComposer)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(post: post)
                        }
                }
            }
            Tab("自分", systemImage: "person.fill") {
                NavigationStack {
                    MineView(store: store, showsComposer: $showsComposer)
                        .navigationDestination(for: Post.self) { post in
                            PostDetailView(post: post)
                        }
                }
            }
        }
        .tint(Color.irukaBlue)
        .sheet(isPresented: $showsComposer) {
            ComposeSheet { body in
                store.add(body: body)
            }
        }
    }
}

#Preview {
    ContentView()
}
