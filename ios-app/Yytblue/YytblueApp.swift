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

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .modifier(AppLanguageModifier())
        }
    }
}
