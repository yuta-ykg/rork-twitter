import SwiftUI

struct ContentView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var selectedTab: FeedTab = .home
    @State private var showsComposer = false
    @State private var showsMine = false
    @State private var quoteTarget: Post?
    @State private var replyTarget: Post?
    @State private var detailId: UUID?
    @State private var query = ""
    @State private var didLoad = false

    private enum FeedTab: Hashable {
        case home, search, notifications, messages
    }

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.white)
            } else if auth.user == nil {
                NavigationStack { SignInView() }
            } else {
                mainShell
            }
        }
        .tint(Color.irukaBlue)
        .task(id: auth.user?.id) {
            didLoad = false
            if let user = auth.user {
                await store.syncProfile(user)
            }
            await store.refresh(userId: auth.user?.id)
            didLoad = true
        }
        .alert(L("投稿"), isPresented: Binding(
            get: { store.composeError != nil },
            set: { if !$0 { store.composeError = nil } }
        )) {
            Button("OK") { store.composeError = nil }
        } message: { Text(L(store.composeError ?? "")) }
        .environment(store)
    }

    private var mainShell: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
                feed
                tabBar
            }
            .background(Color.white)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $showsMine) {
                ProfileView(store: store, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
            }
            .navigationDestination(item: $detailId) { id in
                PostDetailView(store: store, postId: id, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
            }
        }
        .fullScreenCover(isPresented: $showsComposer, onDismiss: { quoteTarget = nil; replyTarget = nil }) {
            NavigationStack { ComposeView(quoting: quoteTarget, replying: replyTarget) }
                .environment(store)
        }
    }

    private func startReply(_ post: Post) {
        replyTarget = post
        showsComposer = true
    }

    private func startQuote(_ post: Post) {
        quoteTarget = post
        showsComposer = true
    }

    private var header: some View {
        ZStack {
            Text(headerTitle)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(Color.irukaInk)
            HStack {
                Button {
                    showsMine = true
                } label: {
                    AvatarView(
                        initial: auth.user?.initial ?? "あ",
                        index: 0,
                        url: auth.user?.picture,
                        size: 32
                    )
                    .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L("プロフィール"))
                Spacer()
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 48)
        .background(Color.white)
    }

    private var headerTitle: String {
        switch selectedTab {
        case .home: L("ホーム")
        case .search: L("検索")
        case .notifications: L("通知")
        case .messages: L("メッセージ")
        }
    }

    @ViewBuilder
    private var feed: some View {
        switch selectedTab {
        case .home:
            timeline(store.timeline.filter { $0.replyTo == nil }, searching: false)
        case .search:
            VStack(spacing: 0) {
                searchField
                timeline(searchResults, searching: true)
            }
        case .notifications:
            quietNote(L("通知はありません"))
        case .messages:
            quietNote(L("メッセージはありません"))
        }
    }

    private var searchResults: [Post] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return store.timeline }
        return store.timeline.filter {
            $0.body.localizedStandardContains(needle)
                || $0.authorName.localizedStandardContains(needle)
                || $0.handle.localizedStandardContains(needle)
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.irukaSecondary)
            TextField(L("キーワードで投稿を検索"), text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 40)
        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private func timeline(_ posts: [Post], searching: Bool) -> some View {
        Group {
            if !didLoad {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HomeView(store: store, posts: posts, isSearching: searching && !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
                    .refreshable { await store.refresh(userId: auth.user?.id) }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if selectedTab == .home || selectedTab == .search {
                composeButton
                    .padding(.trailing, 16)
                    .padding(.bottom, 18)
            }
        }
    }

    private func quietNote(_ message: String) -> some View {
        Text(message)
            .font(.system(size: 15))
            .foregroundStyle(Color.irukaSecondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.white)
    }

    private var composeButton: some View {
        Button {
            showsComposer = true
        } label: {
            Image(systemName: "square.and.pencil")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Color.irukaBlue, in: Circle())
                .shadow(color: Color.irukaBlue.opacity(0.35), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L("投稿する"))
    }

    private var tabBar: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.irukaHairline).frame(height: 1)
            HStack(spacing: 0) {
                tabButton(.home, symbol: selectedTab == .home ? "house.fill" : "house")
                tabButton(.search, symbol: "magnifyingglass")
                tabButton(.notifications, symbol: selectedTab == .notifications ? "bell.fill" : "bell")
                tabButton(.messages, symbol: selectedTab == .messages ? "envelope.fill" : "envelope")
            }
            .padding(.top, 6)
            .padding(.bottom, 4)
            .background(Color.white)
        }
    }

    private func tabButton(_ tab: FeedTab, symbol: String) -> some View {
        Button {
            selectedTab = tab
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 22, weight: selectedTab == tab ? .semibold : .regular))
                .foregroundStyle(selectedTab == tab ? Color.irukaBlue : Color.irukaSecondary)
                .frame(maxWidth: .infinity, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tabTitle(tab))
        .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
    }

    private func tabTitle(_ tab: FeedTab) -> String {
        switch tab {
        case .home: L("ホーム")
        case .search: L("検索")
        case .notifications: L("通知")
        case .messages: L("メッセージ")
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthManager())
}
