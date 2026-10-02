import SwiftUI

struct ReplyComposerView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let post: Post
    @Bindable var store: PostStore
    @State private var draft = ""
    @State private var pending = false
    @State private var replyId = UUID()
    @State private var error: String?
    private var count: Int { draft.unicodeScalars.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if auth.user == nil {
                NavigationLink(L("返信するにはログインしてください。")) { SignInView() }
            } else {
                Text(L("返信先") + ": " + post.handle).font(.subheadline).foregroundStyle(.secondary)
                TextEditor(text: $draft).frame(minHeight: 90).padding(6)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(.secondary.opacity(0.3)))
                    .accessibilityLabel(L("返信本文")).disabled(pending)
                    .onChange(of: draft) { _, _ in if !pending { replyId = UUID(); error = nil } }
                HStack {
                    Text("\(count) / 70").foregroundStyle(count > 70 ? .red : .secondary)
                    Spacer()
                    Button(L(pending ? "送信中…" : "返信する")) {
                        guard let user = auth.user else { return }
                        let content = draft
                        pending = true; error = nil
                        Task {
                            do {
                                try await store.createReply(body: content, parentId: post.id, replyId: replyId, user: user)
                                guard auth.user?.id == user.id else { pending = false; return }
                                draft = ""; replyId = UUID()
                            } catch {
                                if auth.user?.id == user.id { error = "返信を保存できませんでした。" }
                            }
                            pending = false
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(pending || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || count > 70)
                }
                if let error { Text(L(error)).foregroundStyle(.red) }
            }
        }
    }
}
