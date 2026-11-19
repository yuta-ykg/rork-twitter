import SwiftUI

struct ContentView: View {
    @State private var store = WatchStore()
    @State private var showsComposer = false

    var body: some View {
        NavigationStack {
            Group {
                if !store.signedIn {
                    signedOut
                } else {
                    timeline
                }
            }
            .background(Color.watchCanvas)
            .toolbar {
                if store.signedIn {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showsComposer = true
                        } label: {
                            Image(systemName: "pencil")
                                .foregroundStyle(Color.watchBlue)
                        }
                        .accessibilityLabel("投稿する")
                    }
                }
            }
        }
        .task {
            store.activate()
            store.requestTimeline()
        }
        .sheet(isPresented: $showsComposer) {
            WatchComposer(store: store)
        }
    }

    private var timeline: some View {
        List {
            if store.posts.isEmpty {
                Text("まだ投稿がありません。")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.watchSecondary)
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            } else {
                ForEach(store.posts) { post in
                    WatchPostRow(post: post)
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .navigationTitle(store.userHandle.isEmpty ? "イルカ" : store.userHandle)
        .refreshable { store.requestTimeline() }
    }

    private var signedOut: some View {
        VStack(spacing: 8) {
            Image(systemName: "applewatch")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(Color.watchBlue)
            Text("iPhoneでログインしてください")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.watchInk)
                .multilineTextAlignment(.center)
            Text("ペアリングしたiPhoneのイルカアプリでログインすると、タイムラインがここに表示されます。")
                .font(.system(size: 12))
                .foregroundStyle(Color.watchSecondary)
                .multilineTextAlignment(.center)
            Button {
                store.requestTimeline()
            } label: {
                Text("更新")
            }
            .tint(Color.watchBlue)
        }
        .padding(.horizontal, 8)
    }
}

struct WatchPostRow: View {
    let post: WatchPost

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .center, spacing: 6) {
                Circle()
                    .fill(Color(hex: WatchAvatarPalette.fills[abs(post.avatarIndex) % WatchAvatarPalette.fills.count]))
                    .frame(width: 26, height: 26)
                    .overlay {
                        Text(post.initial)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Color.watchInk.opacity(0.72))
                    }
                    .accessibilityHidden(true)
                Text(post.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.watchInk)
                    .lineLimit(1)
                if post.isMine {
                    Text("自分")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Color.watchBlue)
                }
                Spacer(minLength: 4)
                Text(WatchAge.label(for: post.date))
                    .font(.system(size: 11))
                    .foregroundStyle(Color.watchSecondary)
            }
            Text(post.handle)
                .font(.system(size: 11))
                .foregroundStyle(Color.watchSecondary)
                .lineLimit(1)
            Text(post.body)
                .font(.system(size: 14))
                .foregroundStyle(Color.watchInk)
            HStack(spacing: 3) {
                Image(systemName: "heart")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.watchSecondary)
                Text("\(post.likeCount)")
                    .font(.system(size: 11).monospacedDigit())
                    .foregroundStyle(Color.watchSecondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct WatchComposer: View {
    let store: WatchStore
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool
    @State private var text = ""
    @State private var sending = false
    @State private var failure: String?
    @State private var queuedNote = false

    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var count: Int { text.unicodeScalars.count }
    private var overLimit: Bool { count > store.characterLimit }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 8) {
                TextField("いまの気持ちを、\(store.characterLimit)字まで。", text: $text, axis: .vertical)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.watchInk)
                    .focused($focused)
                HStack {
                    Spacer()
                    Text("\(count) / \(store.characterLimit)")
                        .font(.system(size: 11).monospacedDigit())
                        .foregroundStyle(overLimit ? Color.red : Color.watchSecondary)
                }
                if overLimit {
                    Text("文字数が上限を超えています")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.red)
                }
                if let failure {
                    Text(failure)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.red)
                }
                if queuedNote {
                    Text("iPhoneと接続後に投稿されます")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.watchSecondary)
                }
            }
            .padding(.horizontal, 6)
            .navigationTitle("新しい投稿")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if sending {
                        ProgressView()
                            .tint(Color.watchBlue)
                    } else {
                        Button("投稿") { send() }
                            .foregroundStyle(Color.watchBlue)
                            .disabled(trimmed.isEmpty || overLimit)
                    }
                }
            }
        }
        .task { focused = true }
    }

    private func send() {
        guard !trimmed.isEmpty, !overLimit, !sending else { return }
        sending = true
        failure = nil
        queuedNote = false
        store.sendCompose(trimmed) { result in
            sending = false
            switch result {
            case .sent:
                dismiss()
            case .queued:
                queuedNote = true
                Task {
                    try? await Task.sleep(for: .seconds(2))
                    dismiss()
                }
            case .failed(let message):
                failure = message
            }
        }
    }
}
