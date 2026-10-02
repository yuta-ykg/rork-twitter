import SwiftUI

/// Google「G」ブランドマーク（公式24×24パスをベクター描画）。
struct GoogleMark: View {
    var body: some View {
        GeometryReader { proxy in
            let s = proxy.size.width / 24
            ZStack(alignment: .topLeading) {
                bluePath(s).fill(Color(red: 0x42 / 255, green: 0x85 / 255, blue: 0xF4 / 255))
                greenPath(s).fill(Color(red: 0x34 / 255, green: 0xA8 / 255, blue: 0x53 / 255))
                yellowPath(s).fill(Color(red: 0xFB / 255, green: 0xBC / 255, blue: 0x05 / 255))
                redPath(s).fill(Color(red: 0xEA / 255, green: 0x43 / 255, blue: 0x35 / 255))
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func bluePath(_ s: CGFloat) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 23.49 * s, y: 12.27 * s))
        p.addCurve(to: CGPoint(x: 23.30 * s, y: 10.00 * s),
                   control1: CGPoint(x: 23.49 * s, y: 11.48 * s),
                   control2: CGPoint(x: 23.42 * s, y: 10.73 * s))
        p.addLine(to: CGPoint(x: 12 * s, y: 10 * s))
        p.addLine(to: CGPoint(x: 12 * s, y: 14.51 * s))
        p.addLine(to: CGPoint(x: 18.47 * s, y: 14.51 * s))
        p.addCurve(to: CGPoint(x: 16.07 * s, y: 18.09 * s),
                   control1: CGPoint(x: 18.18 * s, y: 15.99 * s),
                   control2: CGPoint(x: 17.33 * s, y: 17.24 * s))
        p.addLine(to: CGPoint(x: 16.07 * s, y: 21.09 * s))
        p.addLine(to: CGPoint(x: 19.93 * s, y: 21.09 * s))
        p.addCurve(to: CGPoint(x: 23.49 * s, y: 12.27 * s),
                   control1: CGPoint(x: 22.19 * s, y: 19.00 * s),
                   control2: CGPoint(x: 23.49 * s, y: 15.92 * s))
        p.closeSubpath()
        return p
    }

    private func greenPath(_ s: CGFloat) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 12 * s, y: 24 * s))
        p.addCurve(to: CGPoint(x: 19.93 * s, y: 21.09 * s),
                   control1: CGPoint(x: 15.24 * s, y: 24.00 * s),
                   control2: CGPoint(x: 17.95 * s, y: 22.92 * s))
        p.addLine(to: CGPoint(x: 16.07 * s, y: 18.09 * s))
        p.addCurve(to: CGPoint(x: 12.00 * s, y: 19.25 * s),
                   control1: CGPoint(x: 14.99 * s, y: 18.81 * s),
                   control2: CGPoint(x: 13.62 * s, y: 19.25 * s))
        p.addCurve(to: CGPoint(x: 5.27 * s, y: 14.29 * s),
                   control1: CGPoint(x: 8.87 * s, y: 19.25 * s),
                   control2: CGPoint(x: 6.22 * s, y: 17.14 * s))
        p.addLine(to: CGPoint(x: 1.29 * s, y: 14.29 * s))
        p.addLine(to: CGPoint(x: 1.29 * s, y: 17.38 * s))
        p.addCurve(to: CGPoint(x: 12 * s, y: 24 * s),
                   control1: CGPoint(x: 3.26 * s, y: 21.30 * s),
                   control2: CGPoint(x: 7.31 * s, y: 24.00 * s))
        p.closeSubpath()
        return p
    }

    private func yellowPath(_ s: CGFloat) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 5.27 * s, y: 14.29 * s))
        p.addCurve(to: CGPoint(x: 4.89 * s, y: 12.00 * s),
                   control1: CGPoint(x: 5.02 * s, y: 13.57 * s),
                   control2: CGPoint(x: 4.89 * s, y: 12.80 * s))
        p.addCurve(to: CGPoint(x: 5.27 * s, y: 9.71 * s),
                   control1: CGPoint(x: 4.89 * s, y: 11.20 * s),
                   control2: CGPoint(x: 5.03 * s, y: 10.43 * s))
        p.addLine(to: CGPoint(x: 5.27 * s, y: 6.62 * s))
        p.addLine(to: CGPoint(x: 1.29 * s, y: 6.62 * s))
        p.addCurve(to: CGPoint(x: 0.00 * s, y: 12.00 * s),
                   control1: CGPoint(x: 0.47 * s, y: 8.24 * s),
                   control2: CGPoint(x: 0.00 * s, y: 10.06 * s))
        p.addCurve(to: CGPoint(x: 1.29 * s, y: 17.38 * s),
                   control1: CGPoint(x: 0.00 * s, y: 13.94 * s),
                   control2: CGPoint(x: 0.47 * s, y: 15.76 * s))
        p.addLine(to: CGPoint(x: 5.27 * s, y: 14.29 * s))
        p.closeSubpath()
        return p
    }

    private func redPath(_ s: CGFloat) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 12 * s, y: 4.75 * s))
        p.addCurve(to: CGPoint(x: 16.60 * s, y: 6.55 * s),
                   control1: CGPoint(x: 13.77 * s, y: 4.75 * s),
                   control2: CGPoint(x: 15.35 * s, y: 5.36 * s))
        p.addLine(to: CGPoint(x: 20.02 * s, y: 3.13 * s))
        p.addCurve(to: CGPoint(x: 12 * s, y: 0.00 * s),
                   control1: CGPoint(x: 17.95 * s, y: 1.19 * s),
                   control2: CGPoint(x: 15.24 * s, y: 0.00 * s))
        p.addCurve(to: CGPoint(x: 1.29 * s, y: 6.62 * s),
                   control1: CGPoint(x: 7.31 * s, y: 0.00 * s),
                   control2: CGPoint(x: 3.26 * s, y: 2.70 * s))
        p.addLine(to: CGPoint(x: 5.27 * s, y: 9.71 * s))
        p.addCurve(to: CGPoint(x: 12.00 * s, y: 4.75 * s),
                   control1: CGPoint(x: 6.22 * s, y: 6.86 * s),
                   control2: CGPoint(x: 8.87 * s, y: 4.75 * s))
        p.closeSubpath()
        return p
    }
}
