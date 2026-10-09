import AuthenticationServices
import SwiftUI

struct SignInView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    var title: String = "ログインしてはじめる"
    var message: String = "GoogleかAppleで入ると、自分の投稿が残ります。"

    var body: some View {
        @Bindable var auth = auth

        VStack(spacing: 14) {
            Spacer()
            Image("BrandIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 96, height: 96)
                .clipShape(.rect(cornerRadius: 22, style: .continuous))
            Text("@yytblue")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(Color.irukaInk)
            Spacer()

            if auth.isSigningIn {
                ProgressView()
                    .tint(Color.irukaBlue)
                    .frame(minHeight: 24)
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
            .foregroundStyle(Color.irukaInk)
            .background(Color.irukaBackground, in: Capsule())
            .overlay(Capsule().stroke(Color.irukaSecondary.opacity(0.4), lineWidth: 1))
            .disabled(auth.isSigningIn)

            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { _ in
                Task { await auth.signIn(provider: "apple") }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 52)
            .clipShape(Capsule())
            .disabled(auth.isSigningIn)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.irukaBackground)
        .alert(L("ログインできませんでした"), isPresented: $auth.showError) {
            Button("OK") {}
        } message: {
            Text(L(auth.errorMessage))
        }
    }
}
