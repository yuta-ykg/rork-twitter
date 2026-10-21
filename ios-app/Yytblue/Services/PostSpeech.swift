import AVFoundation
import SwiftUI

/// One synthesizer for the whole app so posts never speak over one another.
@Observable
final class PostSpeech: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = PostSpeech()
    private(set) var activeId: UUID?
    private let synthesizer = AVSpeechSynthesizer()
    private var current: AVSpeechUtterance?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func toggle(id: UUID, body: String, language: String) {
        if activeId == id { stop(); return }
        stop()
        guard !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let utterance = AVSpeechUtterance(string: body)
        let containsJapanese = body.range(of: "[ぁ-んァ-ヶ一-龠]", options: .regularExpression) != nil
        let locale = containsJapanese ? "ja-JP" : (["ja": "ja-JP", "en": "en-US", "ko": "ko-KR", "zh": "zh-CN"][language] ?? language)
        utterance.voice = AVSpeechSynthesisVoice(language: locale)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        current = utterance
        activeId = id
        synthesizer.speak(utterance)
    }

    func stop() {
        current = nil
        activeId = nil
        synthesizer.stopSpeaking(at: .immediate)
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        let identity = ObjectIdentifier(utterance)
        Task { @MainActor [weak self] in
            guard let self, let current = self.current, ObjectIdentifier(current) == identity else { return }
            self.current = nil
            self.activeId = nil
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        let identity = ObjectIdentifier(utterance)
        Task { @MainActor [weak self] in
            guard let self, let current = self.current, ObjectIdentifier(current) == identity else { return }
            self.current = nil
            self.activeId = nil
        }
    }
}
