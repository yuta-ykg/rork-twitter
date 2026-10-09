import SwiftUI

/// ログイン前に価値を伝える3枚のスライド。最後のスライドでログインへ進む。
struct OnboardingView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let onDone: () -> Void
    @State private var page: Int = 0

    private struct Slide {
        let icon: String
        let color: Color
        let title: String
        let body: String
    }

    private let slides: [Slide] = [
        Slide(icon: "text.cursor", color: .irukaBlue, title: "70字だけ、書こう。", body: "長文はいらない。いまの気持ちを、ひと言で残せます。"),
        Slide(icon: "heart.fill", color: Color(red: 0.98, green: 0.09, blue: 0.5), title: "ゆるく、つながる。", body: "返信・リポスト・いいねで、誰かの一言にそっと反応できます。"),
        Slide(icon: "person.crop.circle.badge.checkmark", color: Color(red: 0, green: 0.73, blue: 0.49), title: "ログインは、ワンタップ。", body: "GoogleかAppleのアカウントだけで、すぐ始められます。名前やアイコンはあとから変えられます。"),
    ]

    private var isLast: Bool { page == slides.count - 1 }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                if !isLast {
                    Button(L("スキップ")) { onDone() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.irukaSecondary)
                        .frame(minWidth: 44, minHeight: 44)
                }
            }
            .padding(.horizontal, 16)

            TabView(selection: $page) {
                ForEach(Array(slides.enumerated()), id: \.offset) { index, slide in
                    VStack(alignment: .leading, spacing: 28) {
                        Spacer()
                        Image(systemName: slide.icon)
                            .font(.system(size: 56, weight: .semibold))
                            .foregroundStyle(slide.color)
                            .frame(maxWidth: .infinity)
                            .frame(height: 200)
                            .background(Color.irukaField, in: .rect(cornerRadius: 28))
                        VStack(alignment: .leading, spacing: 12) {
                            Text(L(slide.title))
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(Color.irukaInk)
                            Text(L(slide.body))
                                .font(.system(size: 17))
                                .foregroundStyle(Color.irukaSecondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 24)
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack {
                HStack(spacing: 8) {
                    ForEach(0..<slides.count, id: \.self) { index in
                        Capsule()
                            .fill(index == page ? Color.irukaBlue : Color.irukaHairline)
                            .frame(width: index == page ? 24 : 8, height: 8)
                    }
                }
                .animation(.spring(duration: 0.3), value: page)
                Spacer()
                Button {
                    if isLast { onDone() } else { withAnimation { page += 1 } }
                } label: {
                    Text(L(isLast ? "ログインへ進む" : "次へ"))
                        .font(.system(size: 17, weight: .semibold))
                        .padding(.horizontal, 24)
                        .frame(minHeight: 52)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .tint(Color.irukaBlue)
                .sensoryFeedback(.selection, trigger: page)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .background(Color.irukaBackground)
    }
}
