import Foundation

enum PrivacyScope: String, CaseIterable, Identifiable, Codable {
    case personal
    case work
    case sensitive
    case temporary
    case neverExport = "never_export"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .personal: "Personal"
        case .work: "Work"
        case .sensitive: "Sensitive"
        case .temporary: "Temporary"
        case .neverExport: "Never export"
        }
    }
}

enum ContextFormat: String, CaseIterable, Identifiable, Codable {
    case gemini
    case claude
    case chatgpt
    case codex
    case json

    var id: String { rawValue }

    var label: String {
        switch self {
        case .gemini: "Gemini"
        case .claude: "Claude"
        case .chatgpt: "ChatGPT"
        case .codex: "Codex"
        case .json: "Generic JSON"
        }
    }
}

struct IngestResponse: Decodable {
    let source: MemorySource
    let facts: [MemoryFact]
    let wikiPages: [WikiPage]
}

struct MemorySource: Decodable, Identifiable {
    let id: String
    let title: String
    let scope: PrivacyScope
}

struct MemoryFact: Decodable, Identifiable {
    let id: String
    let value: String
    let category: String
    let scope: PrivacyScope
}

struct WikiPage: Decodable, Identifiable {
    let id: String
    let slug: String
    let title: String
}

struct SearchResponse: Decodable {
    let results: [SearchResult]
}

struct SearchResult: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let snippet: String
    let scope: PrivacyScope?
}

struct ContextPack: Decodable, Identifiable {
    let id: String
    let format: ContextFormat
    let purpose: String
    let content: String
    let memoryIds: [String]
}

struct AuditLogResponse: Decodable {
    let events: [AuditEvent]
}

struct AuditEvent: Decodable, Identifiable {
    let id: String
    let action: String
    let message: String
    let createdAt: String
}

