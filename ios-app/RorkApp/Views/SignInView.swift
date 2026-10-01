import AuthenticationServices
import SwiftUI

struct SignInView: View {
    @Environment(\.irukaPalette) private var palette
    @Environment(AuthManager.self) private var auth
    var title: String = "ログインしてはじめる"
    var message: String = "GoogleかAppleで入ると、自分の投稿が残ります。"

    var body: some View {
        @Bindable var auth = auth

        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(palette.ink)
            Text(message)
                .font(.system(size: 16))
                .foregroundStyle(palette.secondary)

            if auth.isSigningIn {
                ProgressView()
                    .tint(palette.blue)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }

            Button {
                Task { await auth.signIn(provider: "google") }
            } label: {
                Text("Googleで続ける")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(palette.blue)
            .disabled(auth.isSigningIn)

            if auth.canSkipLogin {
                Button("開発用にログインをスキップ") { auth.skipLogin() }
                    .buttonStyle(.bordered)
                    .frame(minHeight: 44)
                    .disabled(auth.isSigningIn)
                Text("スキップ中のデータはこの端末内に保存されます。")
                    .font(.footnote).foregroundStyle(palette.secondary)
            }

            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { _ in
                Task { await auth.signIn(provider: "apple") }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .disabled(auth.isSigningIn)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .alert("ログインできませんでした", isPresented: $auth.showError) {
            Button("OK") {}
        } message: {
            Text(auth.errorMessage)
        }
    }
}
