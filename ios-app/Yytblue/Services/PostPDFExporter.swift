import SwiftUI
import UIKit

struct ExportedPostPDF: Identifiable {
    let id = UUID()
    let url: URL
}

@MainActor
enum PostPDFExporter {
    static func create(_ post: Post) throws -> URL {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let width: CGFloat = 499
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        let data = renderer.pdfData { context in
            context.beginPage()
            context.cgContext.setFillColor(UIColor.white.cgColor)
            context.cgContext.fill(page)
            var y: CGFloat = 54
            func draw(_ value: String, font: UIFont, color: UIColor, gap: CGFloat) {
                let text = value as NSString
                let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
                let measured = text.boundingRect(with: CGSize(width: width, height: 620),
                    options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes, context: nil)
                let height = ceil(measured.height) + 3
                text.draw(in: CGRect(x: 48, y: y, width: width, height: height), withAttributes: attributes)
                y += height + gap
            }
            let blue = UIColor(red: 0.08, green: 0.50, blue: 0.74, alpha: 1)
            draw("Iruka", font: .boldSystemFont(ofSize: 15), color: blue, gap: 25)
            draw(L("投稿"), font: .boldSystemFont(ofSize: 23), color: .darkText, gap: 30)
            draw(post.authorName, font: .boldSystemFont(ofSize: 17), color: .darkText, gap: 4)
            draw(post.handle, font: .systemFont(ofSize: 12), color: .gray, gap: 40)
            draw(post.body, font: .systemFont(ofSize: 21), color: .darkText, gap: 30)
            draw(formatDate(post.createdAt), font: .systemFont(ofSize: 11), color: .gray, gap: 0)
            let footer: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 9), .foregroundColor: UIColor.gray]
            ("ID: " + post.id.uuidString).draw(in: CGRect(x: 48, y: 770, width: width, height: 20), withAttributes: footer)
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Iruka-post-\(post.id.uuidString).pdf")
        try data.write(to: url, options: .atomic)
        return url
    }
}

struct PostPDFShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
