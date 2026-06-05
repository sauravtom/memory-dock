import SwiftUI

@main
struct MemoryDockApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        MenuBarExtra("Memory Dock", systemImage: "brain.head.profile") {
            RootView()
                .environmentObject(model)
                .frame(width: 520, height: 680)
        }
        .menuBarExtraStyle(.window)
    }
}

