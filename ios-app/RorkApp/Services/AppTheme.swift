import SwiftUI

enum AppTheme: String, CaseIterable, Identifiable {
    case light, dark, darkBlue = "dark-blue", system
    var id: String { rawValue }
    var title: String {
        switch self {
        case .light: "ライト"
        case .dark: "ダーク"
        case .darkBlue: "ダークブルー"
        case .system: "システム"
        }
    }
    var scheme: ColorScheme? {
        switch self { case .light: .light; case .dark, .darkBlue: .dark; case .system: nil }
    }
}

struct IrukaPalette {
    let background: Color
    let surface: Color
    let ink: Color
    let secondary: Color
    let hairline: Color
    let field: Color
    let blue: Color

    static func make(theme: AppTheme, system: ColorScheme) -> IrukaPalette {
        let dark = theme == .dark || theme == .darkBlue || (theme == .system && system == .dark)
        let navy = theme == .darkBlue
        return IrukaPalette(
            background: Color(hex: navy ? "#15202B" : dark ? "#080808" : "#FFFFFF"),
            surface: Color(hex: navy ? "#1B2938" : dark ? "#121212" : "#FFFFFF"),
            ink: Color(hex: dark ? "#F0F3F5" : "#0F1419"),
            secondary: Color(hex: dark ? "#AAB8C4" : "#536471"),
            hairline: Color(hex: navy ? "#3A4B5C" : dark ? "#3D3D3D" : "#ECF0F2"),
            field: Color(hex: navy ? "#253749" : dark ? "#1F1F1F" : "#F7F9F9"),
            blue: Color(hex: dark ? "#50B8F4" : "#1D9BF0")
        )
    }
}
private struct IrukaPaletteKey: EnvironmentKey {
    static let defaultValue = IrukaPalette.make(theme: .light, system: .light)
}
extension EnvironmentValues {
    var irukaPalette: IrukaPalette {
        get { self[IrukaPaletteKey.self] }
        set { self[IrukaPaletteKey.self] = newValue }
    }
}
struct AppThemeModifier: ViewModifier {
    @AppStorage("iruka-theme") private var choice = AppTheme.system.rawValue
    @Environment(\.colorScheme) private var systemScheme
    func body(content: Content) -> some View {
        let theme = AppTheme(rawValue: choice) ?? .system
        content
            .environment(\.irukaPalette, IrukaPalette.make(theme: theme, system: systemScheme))
            .preferredColorScheme(theme.scheme)
    }
}
