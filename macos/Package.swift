// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MemoryDock",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "MemoryDock", targets: ["MemoryDock"])
    ],
    targets: [
        .executableTarget(name: "MemoryDock")
    ]
)

