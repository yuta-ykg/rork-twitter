//
//  YytblueApp.swift
//  Yytblue
//
//  Created by Rork on October 1, 2026.
//

import SwiftUI

@main
struct YytblueApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var authManager = AuthManager()
    @AppStorage("iruka-theme") private var theme = "system"

    private var scheme: ColorScheme? {
        switch theme {
        case "light": .light
        case "dark": .dark
        default: nil
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .appTextFont(size: 17)
                .environment(authManager)
                .modifier(AppLanguageModifier())
                .preferredColorScheme(scheme)
                .onChange(of: scenePhase) { _, phase in
                    if phase != .active { PostSpeech.shared.stop() }
                }
        }
    }
}
