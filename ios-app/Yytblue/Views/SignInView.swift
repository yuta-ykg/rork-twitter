import AuthenticationServices
import SwiftUI

struct SignInView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    var title: String = "ログインしてはじめる"
    var message: String = "GoogleかAppleで入ると、自分の投稿が残ります。"

    var body: some View {
        @Bindable var auth = auth

        VStack(alignment: .leading, spacing: 16) {
            Text(L(title))
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(Color.irukaInk)
            Text(L(message))
                .font(.system(size: 16))
                .foregroundStyle(Color.irukaSecondary)

            if auth.isSigningIn {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }

            Button {
                Task { await auth.signIn(provider: "google") }
            } label: {
                HStack(spacing: 10) {
                    GoogleMark()
                        .frame(width: 22, height: 22)
                    Text(L("Googleで続ける"))
                }
                .font(.system(size: 17, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.irukaBlue)
            .disabled(auth.isSigningIn)

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
        .alert(L("ログインできませんでした"), isPresented: $auth.showError) {
            Button("OK") {}
        } message: {
            Text(L(auth.errorMessage))
        }
    }
}
