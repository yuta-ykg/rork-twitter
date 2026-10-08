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
    static let irukaInk = Color(red: 0.059, green: 0.078, blue: 0.098)
    static let irukaSecondary = Color(red: 0.325, green: 0.392, blue: 0.443)
    static let irukaHairline = Color(red: 0.925, green: 0.941, blue: 0.949)
    static let irukaField = Color(red: 0.969, green: 0.976, blue: 0.976)

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
