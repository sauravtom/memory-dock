import Foundation

@MainActor
final class APIClient {
    var baseURL: URL

    init(baseURL: URL) {
        self.baseURL = baseURL
    }

    func saveText(title: String, text: String, scope: PrivacyScope) async throws -> IngestResponse {
        let url = baseURL.appending(path: "/api/memories/text")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "title": title,
            "text": text,
            "scope": scope.rawValue
        ])
        return try await send(request)
    }

    func upload(fileURL: URL, scope: PrivacyScope) async throws -> IngestResponse {
        let boundary = "MemoryDock-\(UUID().uuidString)"
        var request = URLRequest(url: baseURL.appending(path: "/api/sources"))
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = try multipartBody(fileURL: fileURL, scope: scope, boundary: boundary)
        return try await send(request)
    }

    func search(query: String, scope: PrivacyScope?) async throws -> [SearchResult] {
        var components = URLComponents(url: baseURL.appending(path: "/api/search"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: "12")
        ]
        if let scope {
            components.queryItems?.append(URLQueryItem(name: "scope", value: scope.rawValue))
        }
        let response: SearchResponse = try await send(URLRequest(url: components.url!))
        return response.results
    }

    func createContextPack(format: ContextFormat, purpose: String, includedScopes: [PrivacyScope]) async throws -> ContextPack {
        var request = URLRequest(url: baseURL.appending(path: "/api/context-packs"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "format": format.rawValue,
            "purpose": purpose,
            "includedScopes": includedScopes.map(\.rawValue)
        ])
        return try await send(request)
    }

    func auditLog() async throws -> [AuditEvent] {
        let response: AuditLogResponse = try await send(URLRequest(url: baseURL.appending(path: "/api/audit-log")))
        return response.events
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            let message = String(data: data, encoding: .utf8) ?? "Request failed"
            throw NSError(domain: "MemoryDockAPI", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func multipartBody(fileURL: URL, scope: PrivacyScope, boundary: String) throws -> Data {
        var data = Data()
        let fileData = try Data(contentsOf: fileURL)
        let filename = fileURL.lastPathComponent
        let mimeType = mimeTypeFor(filename: filename)

        appendField(name: "scope", value: scope.rawValue, to: &data, boundary: boundary)
        data.append("--\(boundary)\r\n".data(using: .utf8)!)
        data.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        data.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        data.append(fileData)
        data.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        return data
    }

    private func appendField(name: String, value: String, to data: inout Data, boundary: String) {
        data.append("--\(boundary)\r\n".data(using: .utf8)!)
        data.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        data.append("\(value)\r\n".data(using: .utf8)!)
    }

    private func mimeTypeFor(filename: String) -> String {
        if filename.hasSuffix(".pdf") { return "application/pdf" }
        if filename.hasSuffix(".json") { return "application/json" }
        if filename.hasSuffix(".md") { return "text/markdown" }
        return "text/plain"
    }
}
