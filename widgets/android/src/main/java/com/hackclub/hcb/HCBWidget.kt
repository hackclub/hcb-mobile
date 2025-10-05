package com.hackclub.hcb

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONException
import org.json.JSONObject
import java.util.logging.Logger
import android.util.Log as AndroidLog
import java.text.NumberFormat
import java.util.*

val WidgetLogger: Logger = Logger.getLogger(HCBWidget::class.java.name)

// Data models matching iOS implementation
data class TransactionHistoryItem(
    val date: String,
    val amountCents: Int
)

data class OrganizationInfo(
    val id: String,
    val name: String
)

data class OrgWidgetData(
    val organizationName: String,
    val organizationSlug: String,
    val organizationId: String,
    val balanceCents: Int,
    val iconUrl: String?,
    val lastUpdated: String,
    val transactionHistory: List<TransactionHistoryItem>
)

data class WidgetPayload(
    val organizations: List<OrganizationInfo>,
    val data: Map<String, OrgWidgetData>
)

data class WidgetEntry(
    val organizationName: String,
    val organizationSlug: String,
    val organizationId: String,
    val balanceCents: Int,
    val iconUrl: String?,
    val lastUpdated: String,
    val transactionHistory: List<TransactionHistoryItem>
)

/**
 * HCB Widget implementation matching iOS functionality
 */
class HCBWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        WidgetLogger.info("ExpoWidgets: Updating ${appWidgetIds.size} widgets")
        // Update all active widgets
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        WidgetLogger.info("ExpoWidgets: First widget enabled")
    }

    override fun onDisabled(context: Context) {
        WidgetLogger.info("ExpoWidgets: Last widget disabled")
    }
}

fun getEntry(context: Context, orgName: String? = null): WidgetEntry {
    val fallbackEntry = WidgetEntry(
        organizationName = "No Organization",
        organizationSlug = "",
        organizationId = "",
        balanceCents = 0,
        iconUrl = null,
        lastUpdated = "Never",
        transactionHistory = emptyList()
    )

    try {
        val jsonData = context
            .getSharedPreferences("${context.packageName}.widgetdata", Context.MODE_PRIVATE)
            .getString("widgetdata", null)

        if (jsonData == null) {
            WidgetLogger.warning("ExpoWidgets: No entry found in shared preferences")
            return fallbackEntry
        }

        WidgetLogger.info("ExpoWidgets: Entry found in shared preferences. Attempting to parse..")
        
        val rootJson = JSONObject(jsonData)
        
        // Parse organizations array
        val orgsArray = rootJson.getJSONArray("organizations")
        val organizations = mutableListOf<OrganizationInfo>()
        for (i in 0 until orgsArray.length()) {
            val orgJson = orgsArray.getJSONObject(i)
            organizations.add(OrganizationInfo(
                id = orgJson.getString("id"),
                name = orgJson.getString("name")
            ))
        }

        // Parse data map
        val dataJson = rootJson.getJSONObject("data")
        
        // Find the right organization data
        val orgData: OrgWidgetData? = if (orgName != null) {
            // Find org by name
            val org = organizations.firstOrNull { it.name == orgName }
            if (org != null) {
                WidgetLogger.info("ExpoWidgets: Found org by name: $orgName -> ${org.id}")
                parseOrgData(dataJson.getJSONObject(org.id))
            } else {
                WidgetLogger.warning("ExpoWidgets: Could not find org with name: $orgName")
                null
            }
        } else if (organizations.isNotEmpty()) {
            val firstOrg = organizations[0]
            WidgetLogger.info("ExpoWidgets: Using first org: ${firstOrg.name}")
            parseOrgData(dataJson.getJSONObject(firstOrg.id))
        } else {
            null
        }

        if (orgData == null) {
            WidgetLogger.warning("ExpoWidgets: No data found for organization")
            return fallbackEntry
        }

        return WidgetEntry(
            organizationName = orgData.organizationName,
            organizationSlug = orgData.organizationSlug,
            organizationId = orgData.organizationId,
            balanceCents = orgData.balanceCents,
            iconUrl = orgData.iconUrl,
            lastUpdated = orgData.lastUpdated,
            transactionHistory = orgData.transactionHistory
        )
    } catch (e: JSONException) {
        WidgetLogger.warning("ExpoWidgets: Error parsing widget data: ${e.message}")
        AndroidLog.e("HCBWidget", "Error parsing widget data", e)
        return fallbackEntry
    } catch (e: Exception) {
        WidgetLogger.warning("ExpoWidgets: Unexpected error: ${e.message}")
        AndroidLog.e("HCBWidget", "Unexpected error", e)
        return fallbackEntry
    }
}

private fun parseOrgData(json: JSONObject): OrgWidgetData {
    // Parse transaction history
    val transactions = mutableListOf<TransactionHistoryItem>()
    if (json.has("transactionHistory")) {
        val transArray = json.getJSONArray("transactionHistory")
        for (i in 0 until transArray.length()) {
            val transJson = transArray.getJSONObject(i)
            transactions.add(TransactionHistoryItem(
                date = transJson.getString("date"),
                amountCents = transJson.getInt("amountCents")
            ))
        }
    }

    return OrgWidgetData(
        organizationName = json.getString("organizationName"),
        organizationSlug = json.getString("organizationSlug"),
        organizationId = json.getString("organizationId"),
        balanceCents = json.getInt("balanceCents"),
        iconUrl = if (json.has("iconUrl") && !json.isNull("iconUrl")) json.getString("iconUrl") else null,
        lastUpdated = json.getString("lastUpdated"),
        transactionHistory = transactions
    )
}

fun formatBalance(balanceCents: Int): String {
    val dollars = balanceCents / 100.0
    val formatter = NumberFormat.getCurrencyInstance(Locale.US)
    return formatter.format(dollars)
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val entry = getEntry(context)
        
        // Get widget dimensions to determine which layout to use
        val widgetOptions = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val minWidth = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
        
        // Determine if this is a medium widget (wider than tall, or width > ~180dp)
        // Medium widgets are typically 2x1 cells, small widgets are 1x1
        val isMediumWidget = minWidth > 180
        
        val views = if (isMediumWidget) {
            // Use medium widget layout with graph
            RemoteViews(context.packageName, R.layout.hcb_widget_medium).apply {
                setTextViewText(R.id.widget_org_name, entry.organizationName)
                setTextViewText(R.id.widget_balance, formatBalance(entry.balanceCents))
                
                // Generate and set graph bitmap
                if (entry.transactionHistory.isNotEmpty()) {
                    setTextViewText(R.id.widget_activity_label, "Recent Activity")
                    
                    // Generate graph bitmap (approximate size for medium widget)
                    val graphWidth = (minWidth * 0.55 * context.resources.displayMetrics.density).toInt()
                    val graphHeight = (minHeight * 0.5 * context.resources.displayMetrics.density).toInt()
                    
                    if (graphWidth > 0 && graphHeight > 0) {
                        val graphBitmap = TransactionGraphGenerator.generateGraphBitmap(
                            entry.transactionHistory,
                            graphWidth,
                            graphHeight
                        )
                        setImageViewBitmap(R.id.widget_transaction_graph, graphBitmap)
                    }
                } else {
                    setTextViewText(R.id.widget_activity_label, "No Activity")
                }
            }
        } else {
            // Use small widget layout
            RemoteViews(context.packageName, R.layout.hcb_widget_small).apply {
                setTextViewText(R.id.widget_org_name_small, entry.organizationName)
                setTextViewText(R.id.widget_balance_label, "Balance")
                setTextViewText(R.id.widget_balance_amount, formatBalance(entry.balanceCents))
            }
        }

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
        WidgetLogger.info("ExpoWidgets: Widget updated successfully")
    } catch (e: Exception) {
        WidgetLogger.warning("ExpoWidgets: Error updating widget: ${e.message}")
        AndroidLog.e("HCBWidget", "Error updating widget", e)
        
        // Fallback display
        val views = RemoteViews(context.packageName, R.layout.hcb_widget_small)
        views.setTextViewText(R.id.widget_org_name_small, "HCB")
        views.setTextViewText(R.id.widget_balance_label, "Balance")
        views.setTextViewText(R.id.widget_balance_amount, "$0.00")
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
