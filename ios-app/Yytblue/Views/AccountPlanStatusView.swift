import SwiftUI
import Supabase
import PostgREST

nonisolated private struct AccountPlanRow: Decodable, Sendable {
    let plan: String
    let character_limit: Int
}

/// Read-only subscription status. No purchase, restoration or external purchase link.
struct AccountPlanStatusView: View {
    let userId: String
    @State private var row: AccountPlanRow?
    @State private var failed = false
    @State private var loading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if loading {
                ProgressView(L("読み込み中…"))
            } else if failed {
                Text(L("契約情報を取得できませんでした。"))
                    .foregroundStyle(Color.irukaSecondary)
                Button(L("再読み込み")) { Task { await load() } }
                    .frame(minHeight: 44)
            } else if let row {
                Text(row.plan == "plus" ? "Plus" : row.plan == "premium" ? "Premium" : L("無料プラン"))
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color.irukaBlue)
                Text(L("投稿文字数上限") + ": \(row.character_limit)")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.irukaSecondary)
            }
        }
        .accessibilityElement(children: .contain)
        .task(id: userId) { await load() }
    }

    private func load() async {
        loading = true
        failed = false
        row = nil
        do {
            let rows: [AccountPlanRow] = try await IrukaDatabase.client
                .rpc("get_account_plan", params: ["expected_user_id": userId])
                .execute().value
            guard !Task.isCancelled else { return }
            guard let first = rows.first else { throw URLError(.badServerResponse) }
            row = first
        } catch {
            guard !Task.isCancelled else { return }
            failed = true
        }
        loading = false
    }
}
