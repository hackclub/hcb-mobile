import AppIntents
import Foundation
import WidgetKit

// Simple organization entity for widget configuration
@available(iOS 16.0, *)
struct OrganizationEntity: Codable, Hashable, Identifiable {
    var id: String
    var name: String
}

// App Intent for selecting organization
@available(iOS 16.0, *)
struct SelectOrganizationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Organization"
    static var description = IntentDescription("Choose which organization to display in the widget")
    
    @Parameter(title: "Organization", optionsProvider: OrganizationOptionsProvider())
    var organizationId: String?
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}

// Options provider for organizations
@available(iOS 16.0, *)
struct OrganizationOptionsProvider: DynamicOptionsProvider {
    func results() async throws -> [String] {
        let widgetSuite = UserDefaults(suiteName: "group.com.hackclub.hcb")!
        
        // Try to fetch organizations
        guard let jsonData = widgetSuite.string(forKey: "MyData"),
              let data = jsonData.data(using: .utf8),
              let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) else {
            // Return empty array if no data
            return []
        }
        
        // Return organization names
        return payload.organizations.map { $0.name }
    }
    
    func defaultResult() async -> String? {
        let widgetSuite = UserDefaults(suiteName: "group.com.hackclub.hcb")!
        
        guard let jsonData = widgetSuite.string(forKey: "MyData"),
              let data = jsonData.data(using: .utf8),
              let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data),
              let firstOrg = payload.organizations.first else {
            return nil
        }
        
        return firstOrg.name
    }
}

