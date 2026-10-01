import SwiftUI

struct HomeView: View {
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("いま、みんなが書いている")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                    Text("70字までの短い投稿")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 12, trailing: 20))
            }

            ForEach(store.timeline) { post in
                NavigationLink(value: post) {
                    PostRowView(post: post)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
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
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                showsComposer = true
            } label: {
                Text("投稿する")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.irukaBlue)
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 8)
        }
    }
}

struct MineView: View {
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool

    var body: some View {
        List {
            Section {
                VStack(spacing: 4) {
                    Text("\(store.thisWeekCount)")
                        .font(.system(size: 56, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .monospacedDigit()
                    Text("今週の投稿")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowSeparator(.hidden)
            }

            if store.mine.isEmpty {
                ContentUnavailableView("まだ投稿がありません", systemImage: "fish", description: Text("70字以内で、いまの気持ちを残しましょう。"))
                    .listRowSeparator(.hidden)
            } else {
                ForEach(store.mine) { post in
                    NavigationLink(value: post) {
                        PostRowView(post: post, showsAuthor: false)
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
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                showsComposer = true
            } label: {
                Text("新しく投稿")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.irukaBlue)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
    }
}
