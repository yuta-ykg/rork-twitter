import Foundation
import WatchConnectivity

/// Apple Watchアプリとの橋渡し。認証はiPhoneに留保し、セッション状態・文字数上限・
/// タイムラインをWatchへ送る。Watchからの投稿依頼はPostStoreへ渡し、サーバー検証を経由させる。
@MainActor
final class WatchConnector: NSObject, WCSessionDelegate {
    static let shared = WatchConnector()

    /// Watchからの投稿依頼（本文と完了通知）。
    var onCompose: ((String, @escaping (Bool) -> Void) -> Void)?
    /// Watchが最新の状態を求めたとき。
    var onPull: (() -> Void)?

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        if session.activationState != .activated {
            session.activate()
        }
    }

    /// 現在の状態とタイムラインをWatchへ反映する。applicationContextは常に最新の1件だけ残る。
    func push(store: PostStore, auth: AuthManager) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        guard let user = auth.user else {
            try? session.updateApplicationContext(["signedIn": false])
            return
        }
        var rows: [[String: Any]] = []
        for post in store.timeline.prefix(30) {
            rows.append([
                "id": post.id.uuidString,
                "name": post.authorName,
                "handle": post.handle,
                "initial": post.initial,
                "body": post.body,
                "time": post.createdAt.timeIntervalSince1970,
                "mine": post.isMine,
                "likes": post.likeCount ?? 0,
                "avatar": post.avatarIndex
            ])
        }
        try? session.updateApplicationContext([
            "signedIn": true,
            "name": user.displayName,
            "handle": user.handle,
            "userId": user.id,
            "limit": store.characterLimit,
            "limitReady": store.limitReady,
            "posts": rows
        ])
    }

    private func handleCompose(_ body: String, reply: (([String: Any]) -> Void)?) {
        guard let onCompose else {
            reply?(["ok": false, "error": "not_ready"])
            return
        }
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            reply?(["ok": false, "error": "empty"])
            return
        }
        onCompose(trimmed) { ok in
            reply?(["ok": ok, "error": ok ? "" : "compose_failed"])
        }
    }

    // MARK: - WCSessionDelegate

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            Task { @MainActor in self.onPull?() }
        }
    }

    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}

    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        Task { @MainActor in
            switch message["action"] as? String {
            case "compose":
                self.handleCompose(message["body"] as? String ?? "", reply: replyHandler)
            case "pull":
                self.onPull?()
                replyHandler(["ok": true])
            default:
                replyHandler(["ok": false, "error": "unknown_action"])
            }
        }
    }

    /// オフライン時にWatchがtransferUserInfoで積んだ投稿依頼。iPhoneアプリ起動後に届く。
    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        guard userInfo["action"] as? String == "compose" else { return }
        Task { @MainActor in
            self.handleCompose(userInfo["body"] as? String ?? "", reply: nil)
        }
    }
}
