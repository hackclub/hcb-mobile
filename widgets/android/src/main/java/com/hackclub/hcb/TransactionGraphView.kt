package com.hackclub.hcb

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import kotlin.math.max

/**
 * Custom view that draws a transaction history graph
 * Matches the iOS TransactionGraphView implementation
 */
class TransactionGraphView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var transactions: List<TransactionHistoryItem> = emptyList()
    
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#E6FFFFFF") // white with 90% opacity
        strokeWidth = 4f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = null // Will be set dynamically
        style = Paint.Style.FILL
    }
    
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#33000000")
        maskFilter = BlurMaskFilter(2f, BlurMaskFilter.Blur.NORMAL)
    }

    fun setTransactionData(transactions: List<TransactionHistoryItem>) {
        this.transactions = transactions
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        if (transactions.isEmpty()) {
            drawPlaceholder(canvas)
            return
        }

        val width = width.toFloat()
        val height = height.toFloat()
        
        // Calculate cumulative balance points
        val balancePoints = calculateBalancePoints()
        
        if (balancePoints.isEmpty()) {
            drawPlaceholder(canvas)
            return
        }
        
        // Find min and max for scaling
        val minBalance = balancePoints.minOfOrNull { it.balance } ?: 0
        val maxBalance = balancePoints.maxOfOrNull { it.balance } ?: 100
        val range = maxBalance - minBalance
        val safeRange = if (range > 0) range else 1
        
        // Create the path for the filled area
        val fillPath = Path()
        val linePath = Path()
        
        balancePoints.forEachIndexed { index, point ->
            val x = (index.toFloat() / max(balancePoints.size - 1, 1).toFloat()) * width
            val normalizedValue = (point.balance - minBalance).toFloat() / safeRange.toFloat()
            val y = height - (normalizedValue * height)
            
            if (index == 0) {
                fillPath.moveTo(x, height)
                fillPath.lineTo(x, y)
                linePath.moveTo(x, y)
            } else {
                fillPath.lineTo(x, y)
                linePath.lineTo(x, y)
            }
        }
        
        // Close the fill path
        val lastX = ((balancePoints.size - 1).toFloat() / max(balancePoints.size - 1, 1).toFloat()) * width
        fillPath.lineTo(lastX, height)
        fillPath.close()
        
        // Update gradient shader for fill
        fillPaint.shader = LinearGradient(
            0f, 0f, 0f, height,
            intArrayOf(
                Color.parseColor("#66FFFFFF"), // white with 40% opacity
                Color.parseColor("#1AFFFFFF")  // white with 10% opacity
            ),
            null,
            Shader.TileMode.CLAMP
        )
        
        // Draw the filled area
        canvas.drawPath(fillPath, fillPaint)
        
        // Draw the line with shadow
        canvas.drawPath(linePath, shadowPaint)
        canvas.drawPath(linePath, linePaint)
    }
    
    private fun drawPlaceholder(canvas: Canvas) {
        // Draw a placeholder icon when no data is available
        val iconSize = 40f
        val centerX = width / 2f
        val centerY = height / 2f
        
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#80FFFFFF") // white with 50% opacity
            strokeWidth = 3f
            style = Paint.Style.STROKE
        }
        
        // Draw a simple chart icon
        val path = Path().apply {
            moveTo(centerX - iconSize / 2, centerY + iconSize / 3)
            lineTo(centerX - iconSize / 4, centerY)
            lineTo(centerX, centerY + iconSize / 4)
            lineTo(centerX + iconSize / 4, centerY - iconSize / 4)
            lineTo(centerX + iconSize / 2, centerY + iconSize / 6)
        }
        canvas.drawPath(path, paint)
    }
    
    private fun calculateBalancePoints(): List<BalancePoint> {
        val points = mutableListOf<BalancePoint>()
        var runningBalance = 0
        
        for (transaction in transactions) {
            runningBalance += transaction.amountCents
            points.add(BalancePoint(balance = runningBalance, date = transaction.date))
        }
        
        return points
    }
    
    private data class BalancePoint(val balance: Int, val date: String)
}

/**
 * Helper object to generate graph bitmap for RemoteViews
 * Since RemoteViews can't use custom views directly, we generate a bitmap
 */
object TransactionGraphGenerator {
    fun generateGraphBitmap(
        transactions: List<TransactionHistoryItem>,
        width: Int,
        height: Int
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        if (transactions.isEmpty()) {
            drawPlaceholder(canvas, width.toFloat(), height.toFloat())
            return bitmap
        }
        
        // Calculate cumulative balance points
        val balancePoints = calculateBalancePoints(transactions)
        
        if (balancePoints.isEmpty()) {
            drawPlaceholder(canvas, width.toFloat(), height.toFloat())
            return bitmap
        }
        
        // Find min and max for scaling
        val minBalance = balancePoints.minOfOrNull { it.balance } ?: 0
        val maxBalance = balancePoints.maxOfOrNull { it.balance } ?: 100
        val range = maxBalance - minBalance
        val safeRange = if (range > 0) range else 1
        
        // Create the path for the filled area
        val fillPath = Path()
        val linePath = Path()
        
        balancePoints.forEachIndexed { index, point ->
            val x = (index.toFloat() / max(balancePoints.size - 1, 1).toFloat()) * width
            val normalizedValue = (point.balance - minBalance).toFloat() / safeRange.toFloat()
            val y = height - (normalizedValue * height)
            
            if (index == 0) {
                fillPath.moveTo(x, height.toFloat())
                fillPath.lineTo(x, y)
                linePath.moveTo(x, y)
            } else {
                fillPath.lineTo(x, y)
                linePath.lineTo(x, y)
            }
        }
        
        // Close the fill path
        val lastX = ((balancePoints.size - 1).toFloat() / max(balancePoints.size - 1, 1).toFloat()) * width
        fillPath.lineTo(lastX, height.toFloat())
        fillPath.close()
        
        // Fill paint with gradient
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, 0f, height.toFloat(),
                intArrayOf(
                    Color.parseColor("#66FFFFFF"), // white with 40% opacity
                    Color.parseColor("#1AFFFFFF")  // white with 10% opacity
                ),
                null,
                Shader.TileMode.CLAMP
            )
            style = Paint.Style.FILL
        }
        
        // Line paint
        val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#E6FFFFFF") // white with 90% opacity
            strokeWidth = 4f
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }
        
        // Shadow paint
        val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#33000000")
            strokeWidth = 4f
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            maskFilter = BlurMaskFilter(2f, BlurMaskFilter.Blur.NORMAL)
        }
        
        // Draw the filled area
        canvas.drawPath(fillPath, fillPaint)
        
        // Draw the line with shadow
        canvas.drawPath(linePath, shadowPaint)
        canvas.drawPath(linePath, linePaint)
        
        return bitmap
    }
    
    private fun drawPlaceholder(canvas: Canvas, width: Float, height: Float) {
        // Draw a placeholder icon when no data is available
        val iconSize = 40f
        val centerX = width / 2f
        val centerY = height / 2f
        
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#80FFFFFF") // white with 50% opacity
            strokeWidth = 3f
            style = Paint.Style.STROKE
        }
        
        // Draw a simple chart icon
        val path = Path().apply {
            moveTo(centerX - iconSize / 2, centerY + iconSize / 3)
            lineTo(centerX - iconSize / 4, centerY)
            lineTo(centerX, centerY + iconSize / 4)
            lineTo(centerX + iconSize / 4, centerY - iconSize / 4)
            lineTo(centerX + iconSize / 2, centerY + iconSize / 6)
        }
        canvas.drawPath(path, paint)
    }
    
    private fun calculateBalancePoints(transactions: List<TransactionHistoryItem>): List<BalancePoint> {
        val points = mutableListOf<BalancePoint>()
        var runningBalance = 0
        
        for (transaction in transactions) {
            runningBalance += transaction.amountCents
            points.add(BalancePoint(balance = runningBalance, date = transaction.date))
        }
        
        return points
    }
    
    private data class BalancePoint(val balance: Int, val date: String)
}
