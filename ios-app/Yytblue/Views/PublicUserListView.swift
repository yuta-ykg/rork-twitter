import SwiftUI

struct PublicUserListView: View {
    let id: UUID
    @Environment(AuthManager.self) private var auth
    @State private var snapshot: PublicListSnapshot?
    @State private var loading = true
    @State private var failed = false
    var body: some View {
        List {
            if loading { ProgressView() }
            else if failed {
                Text(L("公開リストを読み込めませんでした。"))
                Button(L("再読み込み")) { Task { await load() } }
            } else if let snapshot {
                if !snapshot.list.description.isEmpty { Text(snapshot.list.description) }
                Section(L("メンバー")) {
                    ForEach(snapshot.list.members) { member in
                        Text("\(member.name) \(member.handle.map { "@" + $0 } ?? "")")
                    }
                }
                Section(L("リストの投稿")) {
                    ForEach(snapshot.posts, id: \.id) { post in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(post.authorName).font(.headline)
                            Text(post.handle).font(.caption).foregroundStyle(.secondary)
                            Text(post.body)
                            Text(post.createdAt, style: .date).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if snapshot.posts.isEmpty { Text(L("まだ投稿がありません。")) }
                }
            } else { Text(L("このリストは公開されていないか、削除されています。")) }
        }
        .navigationTitle(snapshot?.list.name ?? L("公開リスト"))
        .toolbar {
            if snapshot != nil, let url = PublicListService.shareURL(id) {
                ShareLink(item: url) { Label(L("共有リンク"), systemImage: "square.and.arrow.up") }
            }
        }
        .task(id: auth.user?.id) { await load() }
        .refreshable { await load() }
    }
    private func load() async {
        let userId = auth.user?.id
        snapshot = nil; loading = true; failed = false
        do {
            let result = try await PublicListService.fetch(id)
            guard !Task.isCancelled, userId == auth.user?.id else { return }
            snapshot = result
        } catch {
            guard !Task.isCancelled, userId == auth.user?.id else { return }
            failed = true
        }
        loading = false
    }
}
