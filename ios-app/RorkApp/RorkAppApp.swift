//
//  RorkAppApp.swift
//  RorkApp
//
//  Created by Rork on October 1, 2026.
//

import SwiftUI

@main
struct RorkAppApp: App {
    @State private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .modifier(AppLanguageModifier())
                .modifier(AppThemeModifier())
        }
    }
}
