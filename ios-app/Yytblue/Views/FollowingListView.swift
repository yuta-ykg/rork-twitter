import SwiftUI

/// フォロー中のユーザー一覧。名前・ユーザーIDで絞り込める。
struct FollowingListView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(PostStore.self) private var store
    @State private var profiles: [IrukaProfile] = []
    @State private var isLoading = true
    @State private var term = ""

    private var filtered: [IrukaProfile] {
        let q = term.trimmingCharacters(in: .whitespaces).lowercased().replacingOccurrences(of: "@", with: "")
        guard !q.isEmpty else { return profiles }
        return profiles.filter { $0.name.lowercased().contains(q) || ($0.handle ?? "").lowercased().contains(q) }
    }

    var body: some View {
        List {
            ForEach(filtered) { profile in
                Button { store.profileRequest = profile.id } label: {
                    HStack(spacing: 12) {
                        AvatarView(initial: String(profile.name.prefix(1)), index: 0, url: profile.avatarUrl, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(profile.name).font(.system(size: 15, weight: .bold)).foregroundStyle(Color.irukaInk).lineLimit(1)
                            if let handle = profile.handle {
                                Text("@" + handle).font(.system(size: 14)).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.plain)
        .overlay {
            if isLoading {
                ProgressView()
            } else if filtered.isEmpty {
                Text(term.trimmingCharacters(in: .whitespaces).isEmpty ? L("まだ誰もフォローしていません。") : L("該当するユーザーがいません。"))
                    .font(.system(size: 14)).foregroundStyle(Color.irukaSecondary)
            }
        }
        .searchable(text: $term, placement: .navigationBarDrawer(displayMode: .always), prompt: L("名前やIDで絞り込む"))
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
        .navigationTitle(L("フォロー中"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let id = auth.user?.id else { return }
            let ids = (try? await FollowService.followingIds(userId: id)) ?? []
            profiles = ((try? await ProfileService.fetch(ids: ids)) ?? []).sorted { $0.name < $1.name }
            isLoading = false
        }
    }
}
