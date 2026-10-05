import SwiftUI

struct DiagnosisLibraryView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let store: PostStore

    @State private var query = ""
    @State private var diagnoses: [PostDiagnosisRow] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        List {
            if isLoading && diagnoses.isEmpty {
                ProgressView(L("読み込み中…"))
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
            } else if let error {
                Text(L(error))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .listRowSeparator(.hidden)
            } else if diagnoses.isEmpty {
                Text(L(query.isEmpty ? "診断がありません。" : "該当する診断がありません。"))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .listRowSeparator(.hidden)
            } else {
                ForEach(diagnoses, id: \.diagnosis.id) { row in
                    PostDiagnosisCard(initialDiagnosis: row.diagnosis, store: store)
                        .padding(.vertical, 6)
                        .listRowSeparator(.hidden)
                }
            }
        }
        .listStyle(.plain)
        .searchable(text: $query, prompt: L("診断を検索"))
        .navigationTitle(L("診断を探す"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(auth.user?.id ?? "")|\(query)") {
            isLoading = true
            error = nil
            do {
                if !query.isEmpty { try await Task.sleep(nanoseconds: 250_000_000) }
                let results = try await store.searchDiagnoses(query, userId: auth.user?.id)
                guard !Task.isCancelled else { return }
                diagnoses = results
            } catch is CancellationError {
                return
            } catch {
                guard !Task.isCancelled else { return }
                self.error = "診断を読み込めませんでした。"
            }
            isLoading = false
        }
    }
}
