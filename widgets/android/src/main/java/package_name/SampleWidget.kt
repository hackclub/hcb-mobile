package expo.modules.widgets.example

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.content.SharedPreferences
import java.util.logging.Logger
import org.json.JSONException
import org.json.JSONObject

val Log: Logger = Logger.getLogger(SampleWidget::class.java.name)

/**
 * Implementation of App Widget functionality.
 */
class SampleWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // There may be multiple widgets active, so update all of them
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Enter relevant functionality for when the first widget is created
    }

    override fun onDisabled(context: Context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val jsonData = context
        .getSharedPreferences("${context.packageName}.widgetdata", Context.MODE_PRIVATE)
        .getString("widgetdata", "{}")

        val data = JSONObject(jsonData)
        
        // Get current counter or default to 0
        val counter = if (data.has("counter")) {
            data.getInt("counter")
        } else {
            0
        }
        
        // Calculate current counter based on time (increment every second)
        val currentTime = System.currentTimeMillis()
        val currentCounter = counter + ((currentTime / 1000) % 1000).toInt()
    
        val views = RemoteViews(context.packageName, R.layout.sample_widget)
        views.setTextViewText(R.id.appwidget_title, "Widget Title #$currentCounter")
        views.setTextViewText(R.id.appwidget_text, data.getString("message"))

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: JSONException) {
        Log.warning("An error occurred parsing widget json!")
        Log.warning(e.message)
        
        // Fallback display
        val views = RemoteViews(context.packageName, R.layout.sample_widget)
        val currentTime = System.currentTimeMillis()
        val currentCounter = ((currentTime / 1000) % 1000).toInt()
        views.setTextViewText(R.id.appwidget_title, "Widget Title #$currentCounter")
        views.setTextViewText(R.id.appwidget_text, "Error loading widget data")
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
