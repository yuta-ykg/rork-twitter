import SwiftUI

struct ContentView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @State private var store = PostStore()
    @State private var notifications = NotificationStore()
    @State private var selectedTab: FeedTab = .home
    @State private var showsComposer = false
    @State private var showsMine = false
    @State private var showsSettings = false
    @State private var quoteTarget: Post?
    @State private var replyTarget: Post?
    @State private var detailId: UUID?
    @State private var query = ""
    @State private var loadedUserId: String?
    @State private var pendingPostId: UUID?
    @State private var profileId: String?
    @State private var homeFeed: HomeFeed = .forYou
    private var didLoad: Bool { auth.user != nil && loadedUserId == auth.user?.id }
    @AppStorage("iruka-onboarded") private var onboarded = false
    @AppStorage("yytblue-terms-accepted-v1") private var acceptedTermsRaw = ""
    private var acceptedTermsOwners: Set<String> {
        get { Set(acceptedTermsRaw.split(separator: ",").map(String.init)) }
        nonmutating set { acceptedTermsRaw = newValue.sorted().joined(separator: ",") }
    }

    private enum HomeFeed: Hashable {
        case forYou, following
    }

    private enum FeedTab: Hashable {
        case home, search, notifications, messages
    }

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.irukaBackground)
            } else if auth.user == nil {
                if onboarded {
                    NavigationStack { SignInView() }
                } else {
                    OnboardingView { onboarded = true }
                }
            } else if let ownerId = auth.owner?.id, !acceptedTermsOwners.contains(ownerId) {
                TermsGateView(
                    onAccept: { acceptedTermsOwners.insert(ownerId) },
                    onDecline: { Task { await auth.signOut() } }
                )
            } else {
                mainShell
            }
        }
        .tint(Color.irukaBlue)
        .task(id: auth.user?.id) {
            if let user = auth.user {
                await store.syncProfile(user)
            }
            await store.refresh(userId: auth.user?.id)
            loadedUserId = auth.user?.id
            await notifications.refresh(userId: auth.user?.id)
        }
        .alert(L("投稿"), isPresented: Binding(
            get: { store.composeError != nil },
            set: { if !$0 { store.composeError = nil } }
        )) {
            Button("OK") { store.composeError = nil }
        } message: { Text(L(store.composeError ?? "")) }
        .environment(store)
        .onOpenURL { url in
            if let id = Self.postId(from: url) { pendingPostId = id }
        }
        .onChange(of: store.profileRequest) { _, id in
            guard let id else { return }
            store.profileRequest = nil
            if id == auth.user?.id { showsMine = true } else { profileId = id }
        }
        .onChange(of: auth.user?.id) { _, _ in
            showsMine = false
            detailId = nil
            profileId = nil
            selectedTab = .home
            homeFeed = .forYou
        }
        .onChange(of: pendingPostId) { _, _ in openPendingPost() }
        .onChange(of: didLoad) { _, _ in openPendingPost() }
    }

    /// https://yytblue.com/post/<UUID> から投稿 ID を取り出す。
    private static func postId(from url: URL) -> UUID? {
        guard let host = url.host?.lowercased(), host == "yytblue.com" || host == "www.yytblue.com" else { return nil }
        let parts = url.pathComponents.filter { $0 != "/" }
        guard parts.count >= 2, parts[0] == "post" else { return nil }
        return UUID(uuidString: parts[1])
    }

    private func openPendingPost() {
        guard didLoad, let id = pendingPostId else { return }
        showsMine = false
        showsSettings = false
        showsComposer = false
        detailId = id
        pendingPostId = nil
    }

    private var mainShell: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
                feed
                tabBar
            }
            .background(Color.irukaBackground)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $showsMine) {
                ProfileView(store: store, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
            }
            .navigationDestination(isPresented: $showsSettings) { SettingsView() }
            .navigationDestination(item: $profileId) { id in
                UserProfileView(store: store, userId: id, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
            }
            .navigationDestination(item: $detailId) { id in
                PostDetailView(store: store, postId: id, onQuote: startQuote, onReply: startReply, onOpen: { detailId = $0.id })
            }
        }
        .fullScreenCover(isPresented: $showsComposer, onDismiss: { quoteTarget = nil; replyTarget = nil }) {
            NavigationStack { ComposeView(quoting: quoteTarget, replying: replyTarget) }
                .environment(store)
        }
        .overlay(alignment: .bottom) {
            if store.pendingDelete != nil {
                HStack(spacing: 12) {
                    Text(L("投稿を削除しました"))
                        .appTextFont(size: 15)
                        .foregroundStyle(.white)
                    Spacer(minLength: 8)
                    Button { store.undoDelete() } label: {
                        Text(L("取り消す"))
                            .appTextFont(size: 15, weight: .bold)
                            .foregroundStyle(Color.irukaBlue)
                            .frame(minWidth: 44, minHeight: 44)
                    }
                }
                .padding(.horizontal, 16)
                .background(Color.irukaInk, in: Capsule())
                .padding(.horizontal, 16)
                .padding(.bottom, 72)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.snappy, value: store.pendingDelete?.post.id)
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
                .appTextFont(size: 17, weight: .bold)
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
                Button {
                    showsSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .appTextFont(size: 18)
                        .foregroundStyle(Color.irukaSecondary)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L("設定"))
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 48)
        .background(Color.irukaBackground)
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
            VStack(spacing: 0) {
                homeFeedPicker
                timeline(homePosts, searching: false)
            }
        case .search:
            VStack(spacing: 0) {
                searchField
                timeline(searchResults, searching: true)
            }
        case .notifications:
            NotificationsView(store: notifications, onOpen: { detailId = $0 })
        case .messages:
            quietNote(L("メッセージはありません"))
        }
    }

    private var homePosts: [Post] {
        let base = store.timeline.filter { $0.replyTo == nil }
        guard homeFeed == .following else { return base }
        return base.filter { $0.isMine || ($0.userId.map { store.followingIds.contains($0) } ?? false) }
    }

    private var homeFeedPicker: some View {
        HStack(spacing: 0) {
            feedTabButton(L("おすすめ"), feed: .forYou)
            feedTabButton(L("フォロー中"), feed: .following)
        }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
    }

    private func feedTabButton(_ title: String, feed: HomeFeed) -> some View {
        Button {
            homeFeed = feed
        } label: {
            Text(title)
                .appTextFont(size: 15, weight: homeFeed == feed ? .bold : .regular)
                .foregroundStyle(homeFeed == feed ? Color.irukaInk : Color.irukaSecondary)
                .frame(maxWidth: .infinity, minHeight: 48)
                .overlay(alignment: .bottom) {
                    if homeFeed == feed { Capsule().fill(Color.irukaBlue).frame(width: 48, height: 4) }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(homeFeed == feed ? .isSelected : [])
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
            .appTextFont(size: 15)
            .foregroundStyle(Color.irukaSecondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.irukaBackground)
    }

    private var composeButton: some View {
        Button {
            showsComposer = true
        } label: {
            Image(systemName: "square.and.pencil")
                .appTextFont(size: 22, weight: .semibold)
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
                tabButton(.notifications, symbol: selectedTab == .notifications ? "bell.fill" : "bell", showsDot: notifications.hasUnread && selectedTab != .notifications)
                tabButton(.messages, symbol: selectedTab == .messages ? "envelope.fill" : "envelope")
            }
            .padding(.top, 6)
            .padding(.bottom, 4)
            .background(Color.irukaBackground)
        }
    }

    private func tabButton(_ tab: FeedTab, symbol: String, showsDot: Bool = false) -> some View {
        Button {
            selectedTab = tab
        } label: {
            Image(systemName: symbol)
                .appTextFont(size: 22, weight: selectedTab == tab ? .semibold : .regular)
                .foregroundStyle(selectedTab == tab ? Color.irukaBlue : Color.irukaSecondary)
                .overlay(alignment: .topTrailing) {
                    if showsDot {
                        Circle().fill(Color.irukaBlue).frame(width: 9, height: 9)
                            .overlay { Circle().stroke(Color.irukaBackground, lineWidth: 2) }
                            .offset(x: 3, y: -2)
                    }
                }
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
