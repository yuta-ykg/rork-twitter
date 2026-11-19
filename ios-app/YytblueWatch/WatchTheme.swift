import SwiftUI

/// デザイン契約のパレット（白ベース・Blue強調）。Watchはライト固定なので明示値を置く。
extension Color {
    static let watchBlue = Color(red: 0.114, green: 0.608, blue: 0.941)
    static let watchInk = Color(red: 0.059, green: 0.078, blue: 0.098)
    static let watchSecondary = Color(red: 0.325, green: 0.392, blue: 0.443)
    static let watchHairline = Color(red: 0.925, green: 0.941, blue: 0.949)
    static let watchField = Color(red: 0.969, green: 0.976, blue: 0.976)
    static let watchCanvas = Color.white

    init(hex: String) {
        var value: UInt64 = 0
        var clean = hex
        if clean.hasPrefix("#") { clean.removeFirst() }
        Scanner(string: clean).scanHexInt64(&value)
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

/// アバターの塗りはiPhoneアプリと同じパレットを周期させる。
enum WatchAvatarPalette {
    static let fills = ["#8ECAE6", "#CDB4DB", "#F4A6A6", "#95D5B2", "#E9C46A"]
}

/// iPhoneアプリのTweetAgeと同じ相対時刻表示。
enum WatchAge {
    static func label(for date: Date) -> String {
        let japanese = Locale.preferredLanguages.first?.hasPrefix("ja") ?? true
        let minutes = max(0, Int(Date().timeIntervalSince(date) / 60))
        if minutes < 1 { return japanese ? "たった今" : "now" }
        if minutes < 60 { return japanese ? "\(minutes)分" : "\(minutes)m" }
        let hours = minutes / 60
        if hours < 24 { return japanese ? "\(hours)時間" : "\(hours)h" }
        let days = hours / 24
        if days < 7 { return japanese ? "\(days)日" : "\(days)d" }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }
}
