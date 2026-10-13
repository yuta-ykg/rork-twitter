import SwiftUI

/// 初回ログイン時に利用規約への同意を求める画面。同意するまでアプリを進められない。
struct TermsGateView: View {
    let onAccept: () -> Void
    let onDecline: () -> Void
    @State private var agreed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            VStack(alignment: .leading, spacing: 8) {
                Text(L("ようこそ、Yytblueへ"))
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundStyle(Color.irukaInk)
                Text(L("はじめる前に、利用規約とプライバシーポリシーをご確認ください。"))
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaSecondary)
            }
            Button {
                agreed.toggle()
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: agreed ? "checkmark.square.fill" : "square")
                        .font(.system(size: 24))
                        .foregroundStyle(agreed ? Color.irukaBlue : Color.irukaSecondary)
                    Text(.init(L("[利用規約](https://yytblue.com/terms)と[プライバシーポリシー](https://yytblue.com/privacy)に同意します")))
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaInk)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                }
                .padding(16)
                .frame(minHeight: 44)
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(agreed ? .isSelected : [])
            Button(action: onAccept) {
                Text(L("同意してはじめる"))
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Color.irukaBlue.opacity(agreed ? 1 : 0.4), in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(!agreed)
            Button(action: onDecline) {
                Text(L("同意せずログアウト"))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.irukaSecondary)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.plain)
            Spacer()
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.irukaBackground)
    }
}
