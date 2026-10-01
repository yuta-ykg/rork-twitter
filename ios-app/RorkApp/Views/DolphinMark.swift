import SwiftUI

struct DolphinMark: View {
    @Environment(\.irukaPalette) private var palette
    var size: CGFloat = 22

    var body: some View {
        Image(systemName: "water.waves")
            .font(.system(size: size * 0.72, weight: .semibold))
            .foregroundStyle(palette.blue)
            .frame(width: size, height: size)
            .accessibilityLabel("イルカ")
            .overlay(alignment: .topTrailing) {
                Circle()
                    .fill(palette.blue)
                    .frame(width: size * 0.28, height: size * 0.28)
                    .offset(x: 1, y: -1)
            }
    }
}

struct Wordmark: View {
    @Environment(\.irukaPalette) private var palette
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "fish.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(palette.blue)
                .accessibilityHidden(true)
            Text("イルカ")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(palette.ink)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("イルカ")
    }
}

extension Color {
    static let irukaBlue = Color(red: 0.114, green: 0.608, blue: 0.941)
    static let irukaInk = Color(red: 0.059, green: 0.078, blue: 0.098)
    static let irukaSecondary = Color(red: 0.325, green: 0.392, blue: 0.443)
    static let irukaHairline = Color(red: 0.925, green: 0.941, blue: 0.949)
    static let irukaField = Color(red: 0.969, green: 0.976, blue: 0.976)
}

extension Color {
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
