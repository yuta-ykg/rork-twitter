import Foundation

nonisolated private struct BillingDeletionRequest: Encodable, Sendable {
    let expected_user_id: String
}

nonisolated private struct BillingDeletionResponse: Decodable, Sendable {
    let ready: Bool
}

/// Stops renewal before deletion. Does not expose purchase or external links on iOS.
@MainActor
 enum BillingDeletionService {
    static func prepare(userId: String) async throws {
        guard let token = KeychainHelper.get("access_token"),
              let url = URL(string: Config.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1/billing-prepare-delete") else {
            throw URLError(.userAuthenticationRequired)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(Config.EXPO_PUBLIC_SUPABASE_ANON_KEY, forHTTPHeaderField: "apikey")
        request.setValue(userId, forHTTPHeaderField: "x-acting-as")
        request.httpBody = try JSONEncoder().encode(BillingDeletionRequest(expected_user_id: userId))
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              try JSONDecoder().decode(BillingDeletionResponse.self, from: data).ready else {
            throw URLError(.badServerResponse)
        }
    }
}
