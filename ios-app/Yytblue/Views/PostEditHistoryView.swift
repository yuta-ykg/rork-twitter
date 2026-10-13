import SwiftUI
import Foundation
import Supabase
import PostgREST

nonisolated struct PostEditEntry: Decodable, Identifiable, Sendable {
    let id: UUID
    let body: String
    let editedAt: Date
    enum CodingKeys: String, CodingKey {
        case id, body
        case editedAt = "edited_at"
    }
}

nonisolated struct PostEditHistoryParams: Encodable, Sendable {
    let target_post_id: UUID
}

/// 過去の本文と、その本文が変更された日時を表示する。
struct PostEditHistoryView: View {
    let post: Post
    @State private var isPresented: Bool = false

    var body: some View {
        Button(L("編集済み")) { isPresented = true }
            .font(.system(size: 13))
            .foregroundStyle(Color.irukaSecondary)
            .frame(minHeight: 44)
            .sheet(isPresented: $isPresented) {
                PostEditHistorySheet(postId: post.id)
            }
    }
}

private struct PostEditHistorySheet: View {
    let postId: UUID
    @Environment(\.dismiss) private var dismiss
    @State private var entries: [PostEditEntry] = []
    @State private var isLoading: Bool = true
    @State private var hasError: Bool = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(L("編集前の本文と、変更された日時を表示します。"))
                        .font(.subheadline)
                        .foregroundStyle(Color.irukaSecondary)
                }
                if isLoading { ProgressView() }
                if hasError {
                    Text(L("履歴を読み込めませんでした。"))
                    Button(L("再読み込み")) { Task { await load() } }
                }
                ForEach(entries) { entry in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(entry.editedAt.formatted(date: .abbreviated, time: .standard))
                            .font(.caption)
                            .foregroundStyle(Color.irukaSecondary)
                        Text(entry.body)
                            .font(.body)
                            .textSelection(.enabled)
                    }
                    .padding(.vertical, 6)
                }
            }
            .navigationTitle(L("編集履歴"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L("閉じる")) { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    @MainActor private func load() async {
        isLoading = true
        hasError = false
        defer { isLoading = false }
        do {
            entries = try await IrukaDatabase.client
                .rpc("get_post_edit_history", params: PostEditHistoryParams(target_post_id: postId))
                .execute().value
        } catch {
            hasError = true
        }
    }
}
