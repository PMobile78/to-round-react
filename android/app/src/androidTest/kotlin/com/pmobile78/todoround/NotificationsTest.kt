package com.pmobile78.todoround

import android.accessibilityservice.AccessibilityService
import android.app.Activity
import android.app.Notification
import android.app.NotificationManager
import android.os.Build
import android.service.notification.StatusBarNotification
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry
import androidx.test.runner.lifecycle.Stage
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.pmobile78.todoround.notifications.REMINDERS_CHANNEL
import com.pmobile78.todoround.notifications.onPush
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The pushes of the server on this phone (stage 3 spec, section 6): what is shown, on which
 * channel and with which time, how a later event of a task replaces the earlier one, and where a
 * tap leads. android/device-tests.sh grants the permission to notify (Android 13+) before the tests.
 */
@RunWith(AndroidJUnit4::class)
class NotificationsTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = ApplicationProvider.getApplicationContext<ToDoRoundApp>()
    private val manager = context.getSystemService(NotificationManager::class.java)

    // A push as functions/lib/messages.js sends it.
    private fun push(type: String, taskId: String, title: String, body: String) = mapOf(
        "type" to type,
        "taskId" to taskId,
        "title" to title,
        "body" to body,
        "url" to "https://pmobile78.github.io/to-round-react/?taskId=$taskId",
    )

    // notify() only queues a notification: Android shows it a moment later.
    private fun shown(): List<StatusBarNotification> = manager.activeNotifications.toList()

    private fun Notification.title() = extras.getCharSequence(Notification.EXTRA_TITLE).toString()

    private fun Notification.text() = extras.getCharSequence(Notification.EXTRA_TEXT).toString()

    @Before
    fun clear() {
        manager.cancelAll()
    }

    // A test that failed with the shade open would leave it over the screens of the next tests.
    @After
    fun closeTheShade() {
        manager.cancelAll()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            instrumentation.uiAutomation.performGlobalAction(AccessibilityService.GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
        }
    }

    // The server sent the push a minute ago. Android drops a notification whose time is long past
    // ("Ignored enqueue for old … notification"); a push lives for a day at most (TTL).
    private val sentAt = System.currentTimeMillis() - 60_000

    @Test
    fun aReminderIsShownOnTheChannelOfRemindersAndALaterEventOfTheTaskReplacesIt() {
        onPush(context, signedIn = true, push("reminder", "t1", "Task reminder", "1 hour before: Buy milk"), sentAt)
        val reminder = waitFor("the reminder") { shown().singleOrNull() }
        assertEquals("t1", reminder.tag)
        assertEquals(REMINDERS_CHANNEL, reminder.notification.channelId)
        assertEquals("Task reminder", reminder.notification.title())
        assertEquals("1 hour before: Buy milk", reminder.notification.text())
        // The time of the server's message, not of its arrival.
        assertEquals(sentAt, reminder.notification.`when`)

        onPush(context, signedIn = true, push("overdue", "t1", "Overdue task!", "Overdue: Buy milk"), sentAt)
        val overdue = waitFor("the overdue task") { shown().singleOrNull()?.takeIf { it.notification.title() == "Overdue task!" } }
        assertEquals("t1", overdue.tag)
        assertEquals("Overdue: Buy milk", overdue.notification.text())

        onPush(context, signedIn = true, push("reminder", "t2", "Task reminder", "1 day before: Call the bank"), sentAt)
        assertEquals(setOf("t1", "t2"), waitFor("two tasks") { shown().takeIf { it.size == 2 } }.map { it.tag }.toSet())
    }

    @Test
    fun aPushOfAnotherKindOrWithNobodySignedInIsNotShown() {
        onPush(context, signedIn = true, push("digest", "t1", "Digest", "3 tasks today"), sentAt)
        onPush(context, signedIn = false, push("reminder", "t2", "Task reminder", "1 hour before: Buy milk"), sentAt)
        // Android shows notifications in the order they come: by the time this one is there, the
        // two before it would be too.
        onPush(context, signedIn = true, push("reminder", "t3", "Task reminder", "1 day before: Call the bank"), sentAt)
        assertEquals(listOf("t3"), waitFor("the control push") { shown().takeIf { it.isNotEmpty() } }.map { it.tag })
    }

    @Test
    fun aTapOpensTheAppWithTheTaskAndRemovesTheNotification() {
        onPush(context, signedIn = true, push("reminder", "t1", "Task reminder", "1 hour before: Buy milk"), sentAt)
        val device = UiDevice.getInstance(instrumentation)
        device.openNotification()
        waitFor("the notification in the shade") { device.wait(Until.findObject(By.text("1 hour before: Buy milk")), 1_000) }.click()

        val opened = waitFor("the app on the screen") { resumed() }
        try {
            assertEquals("t1", opened.intent.getStringExtra("taskId"))
            assertEquals("reminder", opened.intent.getStringExtra("type"))
            // The notification goes away by itself.
            waitFor("the notification gone") { shown().isEmpty().takeIf { it } }
        } finally {
            instrumentation.runOnMainSync { opened.finish() }
        }
    }

    // The activity of the app on the screen, or null while there is none.
    private fun resumed(): Activity? {
        var activity: Activity? = null
        instrumentation.runOnMainSync {
            activity = ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED).firstOrNull()
        }
        return activity
    }

    // [look] until it gives a value, for 10 s at most; [what] names it when it does not come.
    private fun <T : Any> waitFor(what: String, look: () -> T?): T {
        val until = System.currentTimeMillis() + 10_000
        while (true) {
            look()?.let { return it }
            check(System.currentTimeMillis() < until) {
                "$what did not come in 10 s; shown: " + shown().map { "${it.tag}/${it.id}/${it.notification.group}/${it.notification.flags}" }
            }
            Thread.sleep(200)
        }
    }
}
