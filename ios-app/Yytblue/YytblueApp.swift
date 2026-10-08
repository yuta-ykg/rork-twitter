//
//  YytblueApp.swift
//  Yytblue
//
//  Created by Rork on October 1, 2026.
//

import SwiftUI

@main
struct YytblueApp: App {
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
                .environment(authManager)
                .modifier(AppLanguageModifier())
                .preferredColorScheme(scheme)
        }
    }
}
