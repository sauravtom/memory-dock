import SwiftUI
import UniformTypeIdentifiers

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(spacing: 0) {
            HeaderView()
            TabView {
                CaptureView()
                    .tabItem { Label("Capture", systemImage: "tray.and.arrow.down") }
                SearchView()
                    .tabItem { Label("Search", systemImage: "magnifyingglass") }
                ContextPackView()
                    .tabItem { Label("Export", systemImage: "passport") }
                AuditView()
                    .tabItem { Label("Audit", systemImage: "list.bullet.rectangle") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gearshape") }
            }
            StatusBar()
        }
        .task {
            await model.refreshAudit()
        }
    }
}

private struct HeaderView: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 24))
                .foregroundStyle(.blue)
            VStack(alignment: .leading, spacing: 2) {
                Text("Memory Dock")
                    .font(.headline)
                Text("Portable memory for every agent")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(.regularMaterial)
    }
}

private struct CaptureView: View {
    @EnvironmentObject private var model: AppModel
    @State private var isTargeted = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Picker("Scope", selection: $model.selectedScope) {
                    ForEach(PrivacyScope.allCases) { scope in
                        Text(scope.label).tag(scope)
                    }
                }
                .pickerStyle(.segmented)

                DropZone(isTargeted: isTargeted)
                    .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
                        Task {
                            let urls = await loadURLs(from: providers)
                            await model.upload(files: urls)
                        }
                        return true
                    }

                TextField("Title", text: $model.pasteTitle)
                    .textFieldStyle(.roundedBorder)

                TextEditor(text: $model.pasteText)
                    .font(.body)
                    .frame(minHeight: 170)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(.quaternary))

                Button {
                    Task { await model.saveText() }
                } label: {
                    Label("Save pasted memory", systemImage: "plus.circle")
                }
                .buttonStyle(.borderedProminent)
                .disabled(model.isBusy || model.pasteText.isEmpty)
            }
            .padding()
        }
    }

    private func loadURLs(from providers: [NSItemProvider]) async -> [URL] {
        var urls: [URL] = []
        for provider in providers {
            if let item = try? await provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier),
               let data = item as? Data,
               let url = URL(dataRepresentation: data, relativeTo: nil) {
                urls.append(url)
            }
        }
        return urls
    }
}

private struct DropZone: View {
    let isTargeted: Bool

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "doc.badge.plus")
                .font(.system(size: 32))
            Text("Drop .txt, .md, .json, or .pdf files")
                .font(.headline)
            Text("Gemini updates the LLM Wiki; Elastic indexes the memories.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 130)
        .background(isTargeted ? Color.blue.opacity(0.14) : Color.gray.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct SearchView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                TextField("Search memory", text: $model.query)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { Task { await model.search() } }
                Button {
                    Task { await model.search() }
                } label: {
                    Image(systemName: "magnifyingglass")
                }
            }
            Picker("Scope", selection: Binding(
                get: { model.searchScope ?? .personal },
                set: { model.searchScope = $0 }
            )) {
                ForEach(PrivacyScope.allCases) { scope in
                    Text(scope.label).tag(scope)
                }
            }
            .pickerStyle(.segmented)
            List(model.searchResults) { result in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(result.title).font(.headline)
                        Spacer()
                        Text(result.type).font(.caption).foregroundStyle(.secondary)
                    }
                    Text(result.snippet)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
    }
}

private struct ContextPackView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Format", selection: $model.contextFormat) {
                ForEach(ContextFormat.allCases) { format in
                    Text(format.label).tag(format)
                }
            }
            .pickerStyle(.segmented)

            TextEditor(text: $model.contextPurpose)
                .frame(minHeight: 80)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(.quaternary))

            Button {
                Task { await model.createPack() }
            } label: {
                Label("Generate and copy context pack", systemImage: "doc.on.clipboard")
            }
            .buttonStyle(.borderedProminent)

            ScrollView {
                Text(model.contextPack?.content ?? "Generated context packs appear here and are copied to the clipboard.")
                    .font(.system(.caption, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
                    .padding(10)
            }
            .background(Color.gray.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding()
    }
}

private struct AuditView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(alignment: .leading) {
            Button {
                Task { await model.refreshAudit() }
            } label: {
                Label("Refresh audit log", systemImage: "arrow.clockwise")
            }
            List(model.auditEvents) { event in
                VStack(alignment: .leading, spacing: 4) {
                    Text(event.message)
                    Text("\(event.action) | \(event.createdAt)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
    }
}

private struct SettingsView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Form {
            TextField("API base URL", text: $model.apiBaseURL)
            Text("Use your Cloud Run URL for judging, or http://localhost:8080 during local demos.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

private struct StatusBar: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        HStack {
            if model.isBusy {
                ProgressView().controlSize(.small)
            }
            Text(model.status)
                .font(.caption)
                .lineLimit(1)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.regularMaterial)
    }
}

