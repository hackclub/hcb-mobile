public struct TransactionHistoryItem: Codable {
    var date: String
    var amountCents: Int
}

public struct OrganizationInfo: Codable {
    var id: String
    var name: String
}

public struct OrgWidgetData: Codable {
    var organizationName: String
    var organizationSlug: String
    var organizationId: String
    var balanceCents: Int
    var iconUrl: String?
    var lastUpdated: String
    var transactionHistory: [TransactionHistoryItem]?
}

public struct WidgetPayload: Codable {
    var organizations: [OrganizationInfo]
    var data: [String: OrgWidgetData]
}
