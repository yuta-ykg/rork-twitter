import AuthenticationServices
import CryptoKit
import PostgREST
import Supabase
import SwiftUI

@Observable
class AuthManager {
    var user: User?
    /// この端末に保存済みのアカウント。
    private(set) var accounts: [User] = []
    var isLoading = true
    var isSigningIn = false
    var showError = false
    var errorMessage = ""

    private let authURL = Config.EXPO_PUBLIC_RORK_AUTH_URL
    private let appKey = Config.EXPO_PUBLIC_RORK_APP_KEY
    private let projectID = Config.EXPO_PUBLIC_PROJECT_ID
    private var codeVerifier: String?
    private var webAuthSession: ASWebAuthenticationSession?

    private var developerHint: String? {
        UserDefaults.standard.string(forKey: "RORK_DEVELOPER_HINT")
    }

    nonisolated struct User: Codable, Sendable {
        let id: String
        let email: String
        let name: String?
        let picture: String?

        var displayName: String {
            let trimmed = name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return trimmed.isEmpty ? email : trimmed
        }

        var handle: String {
            let local = email.split(separator: "@").first.map(String.init) ?? "you"
            let cleaned = local.filter { $0.isLetter || $0.isNumber || $0 == "_" }
            let value = cleaned.isEmpty ? "you" : String(cleaned.prefix(38))
            return "@\(value)"
        }

        var initial: String {
            String(displayName.prefix(1))
        }
    }

    init() {
        accounts = loadAccounts().map(\.user)
        Task { await checkAuth() }
    }

    nonisolated private struct StoredAccount: Codable, Sendable {
        var user: User
        var access: String
        var refresh: String
    }

    private func loadAccounts() -> [StoredAccount] {
        guard let text = KeychainHelper.get("accounts"),
              let data = text.data(using: .utf8),
              let list = try? JSONDecoder().decode([StoredAccount].self, from: data) else { return [] }
        return list
    }

    private func saveAccounts(_ list: [StoredAccount]) {
        if let data = try? JSONEncoder().encode(list), let text = String(data: data, encoding: .utf8) {
            KeychainHelper.set("accounts", value: text)
        }
        accounts = list.map(\.user)
    }

    private func remember(user: User, access: String, refresh: String) {
        var list = loadAccounts().filter { $0.user.id != user.id }
        list.append(StoredAccount(user: user, access: access, refresh: refresh))
        saveAccounts(list)
    }

    private func fetchAccessToken(refresh: String) async -> String? {
        guard let url = URL(string: "\(authURL)/oauth/refresh") else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["app_key": appKey, "refresh_token": refresh])
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let decoded = try? JSONDecoder().decode(RefreshResponse.self, from: data) else { return nil }
        return decoded.access_token
    }

    @MainActor
    private func activate(_ account: StoredAccount) async -> Bool {
        var access = account.access
        var resolved = userFromToken(access)
        if resolved == nil {
            guard let fresh = await fetchAccessToken(refresh: account.refresh),
                  let refreshedUser = userFromToken(fresh) else { return false }
            access = fresh
            resolved = refreshedUser
        }
        guard let resolved else { return false }
        KeychainHelper.set("access_token", value: access)
        KeychainHelper.set("refresh_token", value: account.refresh)
        remember(user: resolved, access: access, refresh: account.refresh)
        user = resolved
        return true
    }

    /// 保存済みのアカウントへ切り替える。失効していれば一覧から外す。
    @MainActor
    func switchAccount(to id: String) async -> Bool {
        guard id != user?.id, let target = loadAccounts().first(where: { $0.user.id == id }) else { return false }
        if await activate(target) { return true }
        saveAccounts(loadAccounts().filter { $0.user.id != id })
        return false
    }

    /// 使っていないアカウントをこの端末から外す。
    @MainActor
    func removeAccount(id: String) {
        guard id != user?.id else { return }
        saveAccounts(loadAccounts().filter { $0.user.id != id })
    }

    func getAccessToken() -> String? {
        KeychainHelper.get("access_token")
    }

    private func generateCodeVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func generateCodeChallenge(from verifier: String) -> String {
        let data = Data(verifier.utf8)
        let hash = SHA256.hash(data: data)
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private var authEnv: String {
        #if targetEnvironment(simulator)
        return "simulator"
        #else
        return "native"
        #endif
    }

    private func userFromToken(_ token: String) -> User? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }

        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64.append("=") }
        guard let data = Data(base64Encoded: base64) else { return nil }

        struct JWTPayload: Codable {
            let sub: String
            let email: String?
            let name: String?
            let picture: String?
            let exp: TimeInterval?
        }

        guard let payload = try? JSONDecoder().decode(JWTPayload.self, from: data) else { return nil }
        if let exp = payload.exp, Date(timeIntervalSince1970: exp) < Date() {
            return nil
        }
        return User(id: payload.sub, email: payload.email ?? "", name: payload.name, picture: payload.picture)
    }

    private func getRefreshToken() -> String? {
        #if targetEnvironment(simulator)
        if let injected = UserDefaults.standard.string(forKey: "RORK_AUTH_REFRESH_TOKEN") {
            return injected
        }
        #endif
        return KeychainHelper.get("refresh_token")
    }

    @MainActor
    func checkAuth() async {
        defer { isLoading = false }
        if let accessToken = KeychainHelper.get("access_token"),
           let user = userFromToken(accessToken) {
            self.user = user
            if let refresh = KeychainHelper.get("refresh_token") {
                remember(user: user, access: accessToken, refresh: refresh)
            }
            return
        }
        if getRefreshToken() != nil {
            await refreshToken()
        }
    }

    @MainActor
    func signIn(provider: String) async {
        isSigningIn = true
        defer { isSigningIn = false }
        do {
            let verifier = generateCodeVerifier()
            let challenge = generateCodeChallenge(from: verifier)
            codeVerifier = verifier

            guard let url = URL(string: "\(authURL)/oauth/initiate") else {
                setError("ログイン用のURLが不正です")
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            var initiateBody: [String: String] = [
                "app_key": appKey,
                "provider": provider,
                "code_challenge": challenge,
                "target": "swift",
                "env": authEnv,
            ]
            if authEnv == "simulator", let hint = developerHint {
                initiateBody["developer_hint"] = hint
            }
            request.httpBody = try JSONEncoder().encode(initiateBody)

            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    setError(errorResponse.error)
                } else {
                    setError("ログインに失敗しました（\(statusCode)）")
                }
                return
            }
            let initiateResponse = try JSONDecoder().decode(InitiateResponse.self, from: data)

            let code: String
            if initiateResponse.flow == "popup" {
                do {
                    code = try await pollForCode(state: initiateResponse.state)
                } catch AuthError.cancelledByUser {
                    code = try await runWebAuthSession(authURL: initiateResponse.auth_url)
                }
            } else {
                code = try await runWebAuthSession(authURL: initiateResponse.auth_url)
            }
            await exchangeCode(code)
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            return
        } catch {
            setError(error.localizedDescription)
        }
    }

    private func pollForCode(state: String) async throws -> String {
        guard let url = URL(string: "\(authURL)/oauth/poll-code") else {
            throw AuthError.invalidURL
        }
        let deadline = Date().addingTimeInterval(5 * 60)
        while Date() < deadline {
            try await Task.sleep(for: .milliseconds(1500))
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(["app_key": appKey, "state": state])
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { continue }
            guard let pollResponse = try? JSONDecoder().decode(PollCodeResponse.self, from: data) else { continue }
            if pollResponse.status == "cancelled" {
                throw AuthError.cancelledByUser
            }
            if pollResponse.status == "ready", let code = pollResponse.code {
                return code
            }
        }
        throw AuthError.popupTimeout
    }

    private func runWebAuthSession(authURL authURLString: String) async throws -> String {
        let callbackScheme = "rork-\(projectID)"
        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
            guard let url = URL(string: authURLString) else {
                continuation.resume(throwing: AuthError.invalidURL)
                return
            }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                self?.webAuthSession = nil
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let url = callbackURL,
                      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                      let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                    continuation.resume(throwing: AuthError.noCode)
                    return
                }
                continuation.resume(returning: code)
            }
            self.webAuthSession = session
            session.presentationContextProvider = WebAuthPresentationContext.shared
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }
    }

    @MainActor
    private func exchangeCode(_ code: String) async {
        guard let verifier = codeVerifier else { return }
        codeVerifier = nil
        guard let url = URL(string: "\(authURL)/oauth/token") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode([
            "app_key": appKey,
            "code": code,
            "code_verifier": verifier,
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    setError(errorResponse.error)
                } else {
                    setError("ログインに失敗しました（\(statusCode)）")
                }
                return
            }
            let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
            KeychainHelper.set("access_token", value: tokenResponse.access_token)
            KeychainHelper.set("refresh_token", value: tokenResponse.refresh_token)
            remember(user: tokenResponse.user, access: tokenResponse.access_token, refresh: tokenResponse.refresh_token)
            user = tokenResponse.user
        } catch {
            setError("ログインに失敗しました")
        }
    }

    @MainActor
    private func refreshToken() async {
        guard let storedRefreshToken = getRefreshToken() else {
            user = nil
            return
        }
        guard let url = URL(string: "\(authURL)/oauth/refresh") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode([
            "app_key": appKey,
            "refresh_token": storedRefreshToken,
        ])
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                await signOut()
                return
            }
            let refreshResponse = try JSONDecoder().decode(RefreshResponse.self, from: data)
            KeychainHelper.set("access_token", value: refreshResponse.access_token)
            user = userFromToken(refreshResponse.access_token)
            if let user { remember(user: user, access: refreshResponse.access_token, refresh: storedRefreshToken) }
        } catch {
            await signOut()
        }
    }

    @MainActor
    func signOut() async {
        let leaving = user?.id
        let rest = loadAccounts().filter { $0.user.id != leaving }
        saveAccounts(rest)
        KeychainHelper.delete("access_token")
        KeychainHelper.delete("refresh_token")
        UserDefaults.standard.removeObject(forKey: "RORK_AUTH_REFRESH_TOKEN")
        user = nil
        for candidate in rest {
            if await activate(candidate) { return }
            saveAccounts(loadAccounts().filter { $0.user.id != candidate.user.id })
        }
    }

    private func setError(_ message: String) {
        errorMessage = message
        showError = true
    }
}

private struct InitiateResponse: Codable {
    let auth_url: String
    let state: String
    let flow: String?
}

private struct PollCodeResponse: Codable {
    let status: String
    let code: String?
}

private struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String
    let user: AuthManager.User
}

private struct RefreshResponse: Codable {
    let access_token: String
    let expires_in: Int
}

private struct ErrorResponse: Codable {
    let error: String
}

enum AuthError: LocalizedError {
    case noCode
    case invalidURL
    case popupTimeout
    case cancelledByUser

    var errorDescription: String? {
        switch self {
        case .noCode: return "認証コードを受け取れませんでした"
        case .invalidURL: return "URLが不正です"
        case .popupTimeout: return "ログインが時間切れになりました"
        case .cancelledByUser: return "ログインをキャンセルしました"
        }
    }
}

final class WebAuthPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthPresentationContext()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
