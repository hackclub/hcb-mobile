import WidgetKit
import SwiftUI
import AppIntents

let logger = Logger(logHandlers: [MyLogHandler()])

func getEntry(for orgName: String? = nil) -> SimpleEntry {
    let widgetSuite = UserDefaults(suiteName: "group.com.hackclub.hcb")!
  
    let fallbackEntry = SimpleEntry(
      date: Date(),
      organizationName: "No Organization",
      organizationSlug: "",
      organizationId: "",
      balanceCents: 0,
      iconUrl: nil,
      lastUpdated: "Never",
      transactionHistory: []
  )

    if let jsonData = widgetSuite.string(forKey: "MyData") {
        do {
            logger.log(message: "Entry found in suite. Attempting to parse..")
            let decoder = JSONDecoder()
            
            guard let unwrappedData = jsonData.data(using: .utf8) else {
                return fallbackEntry
            }
            
            let payload = try decoder.decode(WidgetPayload.self, from: unwrappedData)
            
            // If orgName is specified, find the org by name and get its data
            // Otherwise, use the first org
            let orgData: OrgWidgetData?
            if let orgName = orgName {
                // Find org by name
                if let org = payload.organizations.first(where: { $0.name == orgName }) {
                    logger.log(message: "Found org by name: \(orgName) -> \(org.id)")
                    orgData = payload.data[org.id]
                } else {
                    logger.log(message: "Could not find org with name: \(orgName)")
                    orgData = nil
                }
            } else if let firstOrg = payload.organizations.first {
                logger.log(message: "Using first org: \(firstOrg.name)")
                orgData = payload.data[firstOrg.id]
            } else {
                orgData = nil
            }
            
            guard let data = orgData else {
                logger.log(message: "No data found for organization")
                return fallbackEntry
            }

            let entry = SimpleEntry(
                date: Date(),
                organizationName: data.organizationName,
                organizationSlug: data.organizationSlug,
                organizationId: data.organizationId,
                balanceCents: data.balanceCents,
                iconUrl: data.iconUrl,
                lastUpdated: data.lastUpdated,
                transactionHistory: data.transactionHistory ?? []
            )
            
            return entry
        } catch (let error) {
            // log using your logger
          logger.log(message: "Error parsing widget data: \(error.localizedDescription)")
        }
    }
    else {
        // no entry found, log using your logger
      logger.log(message: "No entry found in widget suite")
    }

    return fallbackEntry
}

@available(iOS 16.0, *)
struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        getEntry()
    }
    
    func snapshot(for configuration: SelectOrganizationIntent, in context: Context) async -> SimpleEntry {
        let orgId = configuration.organizationId
        return getEntry(for: orgId)
    }
    
    func timeline(for configuration: SelectOrganizationIntent, in context: Context) async -> Timeline<SimpleEntry> {
        let currentDate = Date()
        var entries: [SimpleEntry] = []
        let orgId = configuration.organizationId
        
        // Create entries for the next 30 minutes, updating every 5 minutes
        // Note: iOS controls actual refresh rate based on system budget
        for minuteOffset in stride(from: 0, to: 30, by: 5) {
            if let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate) {
                let entry = getEntry(for: orgId)
                let updatedEntry = SimpleEntry(
                    date: entryDate,
                    organizationName: entry.organizationName,
                    organizationSlug: entry.organizationSlug,
                    organizationId: entry.organizationId,
                    balanceCents: entry.balanceCents,
                    iconUrl: entry.iconUrl,
                    lastUpdated: entry.lastUpdated,
                    transactionHistory: entry.transactionHistory
                )
                entries.append(updatedEntry)
            }
        }
        
        // Set next refresh to be after the last entry (30 minutes)
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate
        return Timeline(
            entries: entries,
            policy: .after(nextRefresh)
        )
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let organizationName: String
    let organizationSlug: String
    let organizationId: String
    let balanceCents: Int
    let iconUrl: String?
    let lastUpdated: String
    let transactionHistory: [TransactionHistoryItem]
}

// Transaction Graph View Component
struct TransactionGraphView: View {
    let transactions: [TransactionHistoryItem]
    
    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            
            if transactions.isEmpty {
                // Show placeholder when no data
                VStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 20))
                        .foregroundColor(.white.opacity(0.5))
                }
                .frame(width: width, height: height)
            } else {
                // Calculate cumulative balance points
                let balancePoints = calculateBalancePoints()
                
                // Find min and max for scaling
                let minBalance = balancePoints.map { $0.balance }.min() ?? 0
                let maxBalance = balancePoints.map { $0.balance }.max() ?? 100
                let range = maxBalance - minBalance
                let safeRange = range > 0 ? range : 1
                
                ZStack(alignment: .bottomLeading) {
                    // Draw the filled area under the curve
                    Path { path in
                        guard !balancePoints.isEmpty else { return }
                        
                        // Start from bottom left
                        let firstPoint = balancePoints[0]
                        let firstX: CGFloat = 0
                        let firstNormalized = CGFloat(firstPoint.balance - minBalance) / CGFloat(safeRange)
                        let firstY = height - (firstNormalized * height)
                        
                        path.move(to: CGPoint(x: firstX, y: height))
                        path.addLine(to: CGPoint(x: firstX, y: firstY))
                        
                        // Create smooth curve through points using quadratic curves
                        for index in 0..<balancePoints.count {
                            let x = (CGFloat(index) / CGFloat(max(balancePoints.count - 1, 1))) * width
                            let normalizedValue = CGFloat(balancePoints[index].balance - minBalance) / CGFloat(safeRange)
                            let y = height - (normalizedValue * height)
                            
                            if index == 0 {
                                // Already moved to first point
                                continue
                            } else if index < balancePoints.count - 1 {
                                // Calculate control point for smooth curve
                                let nextX = (CGFloat(index + 1) / CGFloat(max(balancePoints.count - 1, 1))) * width
                                let midX = (x + nextX) / 2
                                
                                path.addLine(to: CGPoint(x: x, y: y))
                            } else {
                                // Last point
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                        
                        // Close the path at the bottom
                        let lastX = (CGFloat(balancePoints.count - 1) / CGFloat(max(balancePoints.count - 1, 1))) * width
                        path.addLine(to: CGPoint(x: lastX, y: height))
                        path.closeSubpath()
                    }
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(0.4),
                                Color.white.opacity(0.1)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    // Draw the top line with stroke
                    Path { path in
                        for (index, point) in balancePoints.enumerated() {
                            let x = (CGFloat(index) / CGFloat(max(balancePoints.count - 1, 1))) * width
                            let normalizedValue = CGFloat(point.balance - minBalance) / CGFloat(safeRange)
                            let y = height - (normalizedValue * height)
                            
                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(Color.white.opacity(0.9), lineWidth: 2)
                    .shadow(color: .black.opacity(0.2), radius: 1, x: 0, y: 1)
                }
            }
        }
    }
    
    private func calculateBalancePoints() -> [(balance: Int, date: String)] {
        var points: [(balance: Int, date: String)] = []
        var runningBalance = 0
        
        // Work backwards from current balance
        let currentBalance = transactions.last.map { _ in 0 } ?? 0
        
        for transaction in transactions {
            runningBalance += transaction.amountCents
            points.append((balance: runningBalance, date: transaction.date))
        }
        
        return points
    }
}

struct MyWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var widgetFamily
    
    var formattedBalance: String {
        let dollars = Double(entry.balanceCents) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: dollars)) ?? "$0.00"
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Red gradient background that fills entire widget
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.93, green: 0.26, blue: 0.26), // #EC4245
                        Color(red: 0.83, green: 0.16, blue: 0.16)  // Darker red
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .frame(width: geometry.size.width, height: geometry.size.height)
                
                if widgetFamily == .systemMedium {
                    // Medium widget layout with graph
                    HStack(spacing: 16) {
                        // Left side: Organization name and balance
                        VStack(alignment: .leading, spacing: 6) {
                            // Organization name
                            Text(entry.organizationName)
                                .font(.montserratBold(size: 16))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                            
                            Spacer()
                            
                            // Balance label
                            Text("Balance")
                                .font(.montserratBold(size: 12))
                                .foregroundColor(.white.opacity(0.9))
                                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                            
                            // Balance amount
                            Text(formattedBalance)
                                .font(.montserratBold(size: 28))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                            
                            Spacer()
                        }
                        .frame(maxWidth: geometry.size.width * 0.45)
                        
                        // Right side: Transaction graph
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Recent Activity")
                                .font(.montserratBold(size: 11))
                                .foregroundColor(.white.opacity(0.8))
                                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                            
                            TransactionGraphView(transactions: entry.transactionHistory)
                                .frame(height: geometry.size.height * 0.5)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(16)
                } else {
                    // Small widget layout (original)
                    VStack(alignment: .leading, spacing: 6) {
                        // Organization name
                        Text(entry.organizationName)
                            .font(.montserratBold(size: 18))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                        
                        Spacer()
                        
                        // Balance label
                        Text("Balance")
                            .font(.montserratBold(size: 13))
                            .foregroundColor(.white.opacity(0.9))
                            .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                        
                        // Balance amount
                        Text(formattedBalance)
                            .font(.montserratBold(size: 32))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                        
                        Spacer()
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
            }
        }
        .edgesIgnoringSafeArea(.all)
    }
}

struct MyWidget: Widget {
    let kind: String = "HCBWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(kind: kind, intent: SelectOrganizationIntent.self, provider: Provider()) { entry in
                MyWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color.clear
                    }
            }
            .configurationDisplayName("HCB Organization")
            .description("Track your organization's balance. Long-press to select an organization.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
        } else {
            return StaticConfiguration(kind: kind, provider: LegacyProvider()) { entry in
                MyWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("HCB Organization")
            .description("Track your organization's balance.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
        }
    }
}

// Legacy provider for iOS 16 and below (no organization selection)
struct LegacyProvider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        getEntry()
    }
    
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = getEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        var entries: [SimpleEntry] = []
        
        // Create entries for the next 30 minutes, updating every 5 minutes
        for minuteOffset in stride(from: 0, to: 30, by: 5) {
            if let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate) {
                let entry = getEntry()
                let updatedEntry = SimpleEntry(
                    date: entryDate,
                    organizationName: entry.organizationName,
                    organizationSlug: entry.organizationSlug,
                    organizationId: entry.organizationId,
                    balanceCents: entry.balanceCents,
                    iconUrl: entry.iconUrl,
                    lastUpdated: entry.lastUpdated,
                    transactionHistory: entry.transactionHistory
                )
                entries.append(updatedEntry)
            }
        }
        
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate
        let timeline = Timeline(
            entries: entries,
            policy: .after(nextRefresh)
        )
        completion(timeline)
    }
}

struct MyWidget_Previews: PreviewProvider {
    static var previews: some View {
        // Sample transaction history for preview
        let sampleTransactions = [
            TransactionHistoryItem(date: "2025-09-20", amountCents: 50000),
            TransactionHistoryItem(date: "2025-09-22", amountCents: -15000),
            TransactionHistoryItem(date: "2025-09-24", amountCents: 25000),
            TransactionHistoryItem(date: "2025-09-26", amountCents: -8000),
            TransactionHistoryItem(date: "2025-09-28", amountCents: 30000),
            TransactionHistoryItem(date: "2025-09-30", amountCents: -12000),
            TransactionHistoryItem(date: "2025-10-02", amountCents: 40000),
            TransactionHistoryItem(date: "2025-10-04", amountCents: -18000),
        ]
        
        let sampleEntry = SimpleEntry(
            date: Date(),
            organizationName: "YSWS - Cider",
            organizationSlug: "ysws-cider",
            organizationId: "org_123",
            balanceCents: 166478,
            iconUrl: nil,
            lastUpdated: "Oct 4, 2025",
            transactionHistory: sampleTransactions
        )

        Group {
            MyWidgetEntryView(entry: sampleEntry)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small Widget")
            
            MyWidgetEntryView(entry: sampleEntry)
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium Widget")
        }
    }
}
