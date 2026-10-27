package com.pmobile78.todoround.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.pmobile78.todoround.MainActivity
import com.pmobile78.todoround.R

/** The one channel of the app's notifications (stage 3 spec, 2.3 №7); the manifest names it for FCM too. */
const val REMINDERS_CHANNEL = "reminders"

/**
 * The extras of the tap that opens the app: the keys of the push's data, the same as FCM gives the
 * app for a notification it shows itself (spec, section 6).
 */
const val EXTRA_TASK_ID = "taskId"
const val EXTRA_TYPE = "type"

/** What a push of the server (contract, 4.4) asks to show: a reminder or an overdue task, in the texts of the server. */
data class Reminder(val taskId: String, val type: String, val title: String, val body: String)

private val TYPES = setOf("reminder", "overdue")

/**
 * The reminder in the data of a push, or null for a push of another kind, without a task or
 * without its texts (spec 2.3 №11): the server always sends both texts.
 */
fun reminderOf(data: Map<String, String>): Reminder? {
    val type = data["type"]?.takeIf { it in TYPES } ?: return null
    val taskId = data["taskId"]?.takeIf { it.isNotEmpty() } ?: return null
    val title = data["title"]?.takeIf { it.isNotEmpty() } ?: return null
    val body = data["body"]?.takeIf { it.isNotEmpty() } ?: return null
    return Reminder(taskId, type, title, body)
}

/** The channel of the reminders, in the language of the phone; it is there before the first push comes. */
fun createRemindersChannel(context: Context) {
    val channel = NotificationChannelCompat.Builder(REMINDERS_CHANNEL, NotificationManagerCompat.IMPORTANCE_HIGH)
        .setName(context.getString(R.string.reminders_channel))
        .build()
    NotificationManagerCompat.from(context).createNotificationChannel(channel)
}

/**
 * Whether this phone shows the app's reminders: notifications of the app are allowed (on Android
 * 13+ the user gives the permission) and its channel is not switched off.
 */
fun notificationsOn(context: Context): Boolean {
    val manager = NotificationManagerCompat.from(context)
    return manager.areNotificationsEnabled() &&
        manager.getNotificationChannelCompat(REMINDERS_CHANNEL)?.importance != NotificationManagerCompat.IMPORTANCE_NONE
}

/**
 * A push on this phone, sent by the server at [sentAt]: a reminder or an overdue task is shown
 * while someone is signed in (spec 2.3 №12). A task has one notification, so a later event of it
 * replaces the earlier one (№8), and a tap opens the app with the task (№10).
 */
fun onPush(context: Context, signedIn: Boolean, data: Map<String, String>, sentAt: Long) {
    if (!signedIn) return
    val reminder = reminderOf(data) ?: return
    // Without the permission (Android 13+) nothing could be shown.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        return
    }
    // The task in the data of the intent keeps one task's tap apart from another's: intents that
    // differ only in their extras would share one PendingIntent.
    val open = Intent(context, MainActivity::class.java)
        .setData(Uri.Builder().scheme("todoround").authority("task").appendPath(reminder.taskId).build())
        .putExtra(EXTRA_TASK_ID, reminder.taskId)
        .putExtra(EXTRA_TYPE, reminder.type)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val notification = NotificationCompat.Builder(context, REMINDERS_CHANNEL)
        .setSmallIcon(R.drawable.ic_notification)
        .setColor(ContextCompat.getColor(context, R.color.notification))
        .setContentTitle(reminder.title)
        .setContentText(reminder.body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(reminder.body))
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setWhen(sentAt)
        .setShowWhen(true)
        .setAutoCancel(true)
        .setContentIntent(tap)
        .build()
    NotificationManagerCompat.from(context).notify(reminder.taskId, 0, notification)
}
