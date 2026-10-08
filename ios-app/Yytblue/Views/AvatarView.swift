import SwiftUI

struct AvatarView: View {
    let initial: String
    let index: Int
    var url: String? = nil
    var size: CGFloat = 46

    var body: some View {
        Color(hex: AvatarPalette.fills[abs(index) % AvatarPalette.fills.count])
            .frame(width: size, height: size)
            .overlay {
                avatarImage
                    .allowsHitTesting(false)
            }
            .clipShape(Circle())
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var avatarImage: some View {
        if let url, let imageURL = URL(string: url), imageURL.scheme == "https" {
            AsyncImage(url: imageURL) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    initialLabel
                }
            }
        } else if let url, url.hasPrefix("data:image/"), let comma = url.firstIndex(of: ","),
                  let data = Data(base64Encoded: String(url[url.index(after: comma)...])),
                  let image = UIImage(data: data) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            initialLabel
        }
    }

    private var initialLabel: some View {
        Text(initial)
            .font(.system(size: size * 0.36, weight: .semibold))
            .foregroundStyle(Color.irukaInk.opacity(0.72))
    }
}

extension Color {
    static let irukaBlue = Color(red: 0.114, green: 0.608, blue: 0.941)
    static let irukaBackground = dynamic(light: (1, 1, 1), dark: (0, 0, 0))
    static let irukaInk = dynamic(light: (0.059, 0.078, 0.098), dark: (0.906, 0.914, 0.918))
    static let irukaSecondary = dynamic(light: (0.325, 0.392, 0.443), dark: (0.443, 0.463, 0.486))
    static let irukaHairline = dynamic(light: (0.925, 0.941, 0.949), dark: (0.184, 0.200, 0.212))
    static let irukaField = dynamic(light: (0.969, 0.976, 0.976), dark: (0.086, 0.094, 0.102))

    private static func dynamic(light: (Double, Double, Double), dark: (Double, Double, Double)) -> Color {
        Color(UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
    }

    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
