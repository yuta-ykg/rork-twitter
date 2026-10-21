import SwiftUI

enum AppTextSize: String, CaseIterable, Identifiable {
    case standard, large, extraLarge
    var id: String { rawValue }
    var label: String {
        switch self {
        case .standard: "標準"
        case .large: "大"
        case .extraLarge: "特大"
        }
    }
    var scale: CGFloat {
        switch self {
        case .standard: 1
        case .large: 1.2
        case .extraLarge: 1.4
        }
    }
}

private struct AppTextFont: ViewModifier {
    @AppStorage("iruka-text-size") private var selection = AppTextSize.standard.rawValue
    @ScaledMetric private var scaledSize: CGFloat
    let weight: Font.Weight
    let design: Font.Design

    init(size: CGFloat, weight: Font.Weight, design: Font.Design) {
        _scaledSize = ScaledMetric(wrappedValue: size, relativeTo: .body)
        self.weight = weight
        self.design = design
    }

    func body(content: Content) -> some View {
        let choice = AppTextSize(rawValue: selection) ?? .standard
        content.font(.system(size: scaledSize * choice.scale, weight: weight, design: design))
    }
}

extension View {
    /// Local reading preference in addition to the device's Dynamic Type setting.
    func appTextFont(size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default) -> some View {
        modifier(AppTextFont(size: size, weight: weight, design: design))
    }
}
