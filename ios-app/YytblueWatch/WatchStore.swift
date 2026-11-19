import Foundation
import Observation
import WatchConnectivity

struct WatchPost: Identifiable {
    let id: String
    let name: String
    let handle: String
    let initial: String
    let body: String
    let date: Date
    let isMine: Bool
    let likeCount: Int
    let avatarIndex: Int
}

enum WatchComposeResult {
    /// iPhoneアプリが投稿を受け付けた（サーバー検証はiPhone経由で行う）。
    case sent
    /// この場では届かなかった。iPhoneアプリと接続した後に処理される。
    case queued
    case failed(String)
}

/// iPhoneアプリとWatchConnectivityで同期する状態。Watch単独では認証しない。
@MainActor
@Observable
final class WatchStore: NSObject, WCSessionDelegate {
    var signedIn = false
    var userName = ""
    var userHandle = ""
    var characterLimit = 280
    var limitReady = false
    var posts: [WatchPost] = []
    private(set) var activated = false

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        if session.activationState != .activated {
            session.activate()
        }
    }

    /// 最新のタイムラインをiPhoneへ要求する。
    func requestTimeline() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { return }
        session.sendMessage(["action": "pull"], replyHandler: nil)
    }

    /// 投稿依頼をiPhoneへ送る。文字数の最終検証はiPhone・サーバー側で行う。
    func sendCompose(_ body: String, completion: @escaping @MainActor (WatchComposeResult) -> Void) {
        guard WCSession.isSupported() else {
            completion(.failed("iPhoneに接続できません"))
            return
        }
        let session = WCSession.default
        let message = ["action": "compose", "body": body]
        if session.isReachable {
            session.sendMessage(message, replyHandler: { reply in
                Task { @MainActor in
                    if reply["ok"] as? Bool == true {
                        completion(.sent)
                    } else {
                        completion(.failed("iPhoneで投稿できませんでした"))
                    }
                }
            }, errorHandler: { _ in
                session.transferUserInfo(message)
                Task { @MainActor in completion(.queued) }
            })
        } else {
            session.transferUserInfo(message)
            completion(.queued)
        }
    }

    // MARK: - 受信

    private func apply(_ payload: [String: Any]) {
        signedIn = payload["signedIn"] as? Bool ?? false
        userName = payload["name"] as? String ?? ""
        userHandle = payload["handle"] as? String ?? ""
        characterLimit = payload["limit"] as? Int ?? 280
        limitReady = payload["limitReady"] as? Bool ?? false
        guard let rows = payload["posts"] as? [[String: Any]] else { return }
        posts = rows.compactMap { row in
            guard let id = row["id"] as? String, let body = row["body"] as? String else { return nil }
            let time = row["time"] as? Double ?? 0
            return WatchPost(
                id: id,
                name: row["name"] as? String ?? "",
                handle: row["handle"] as? String ?? "",
                initial: row["initial"] as? String ?? "?",
                body: body,
                date: Date(timeIntervalSince1970: time),
                isMine: row["mine"] as? Bool ?? false,
                likeCount: row["likes"] as? Int ?? 0,
                avatarIndex: row["avatar"] as? Int ?? 0
            )
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor in
            self.activated = activationState == .activated
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(applicationContext) }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in self.apply(message) }
    }
}
