import AppKit
import Foundation
import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    @AppStorage("apiBaseURL") var apiBaseURL = "http://localhost:8080" {
        didSet { rebuildClient() }
    }

    @Published var selectedScope: PrivacyScope = .personal
    @Published var pasteTitle = "Quick Memory"
    @Published var pasteText = ""
    @Published var query = ""
    @Published var searchScope: PrivacyScope? = nil
    @Published var searchResults: [SearchResult] = []
    @Published var contextPurpose = "Create a travel-planning context pack for another agent, excluding sensitive and work memories."
    @Published var contextFormat: ContextFormat = .gemini
    @Published var contextPack: ContextPack?
    @Published var auditEvents: [AuditEvent] = []
    @Published var status = "Ready"
    @Published var isBusy = false

    private var client = APIClient(baseURL: URL(string: "http://localhost:8080")!)

    init() {
        rebuildClient()
    }

    func rebuildClient() {
        if let url = URL(string: apiBaseURL) {
            client = APIClient(baseURL: url)
        }
    }

    func saveText() async {
        guard !pasteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        await run("Saving memory") {
            let response = try await client.saveText(title: pasteTitle, text: pasteText, scope: selectedScope)
            pasteText = ""
            status = "Saved \(response.facts.count) memories and updated \(response.wikiPages.count) wiki pages"
            await refreshAudit()
        }
    }

    func upload(files: [URL]) async {
        guard !files.isEmpty else { return }
        await run("Uploading files") {
            var count = 0
            for file in files {
                _ = file.startAccessingSecurityScopedResource()
                defer { file.stopAccessingSecurityScopedResource() }
                _ = try await client.upload(fileURL: file, scope: selectedScope)
                count += 1
            }
            status = "Uploaded \(count) file\(count == 1 ? "" : "s")"
            await search()
            await refreshAudit()
        }
    }

    func search() async {
        await run("Searching") {
            searchResults = try await client.search(query: query, scope: searchScope)
            status = "Found \(searchResults.count) results"
        }
    }

    func createPack() async {
        await run("Creating context pack") {
            let includedScopes = PrivacyScope.allCases.filter { $0 != .sensitive && $0 != .neverExport && $0 != .work }
            contextPack = try await client.createContextPack(format: contextFormat, purpose: contextPurpose, includedScopes: includedScopes)
            if let content = contextPack?.content {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(content, forType: .string)
            }
            status = "Context pack copied to clipboard"
            await refreshAudit()
        }
    }

    func refreshAudit() async {
        do {
            auditEvents = try await client.auditLog()
        } catch {
            status = error.localizedDescription
        }
    }

    private func run(_ busyStatus: String, operation: () async throws -> Void) async {
        isBusy = true
        status = busyStatus
        do {
            try await operation()
        } catch {
            status = error.localizedDescription
        }
        isBusy = false
    }
}
