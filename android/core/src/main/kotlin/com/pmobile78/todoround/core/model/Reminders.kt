package com.pmobile78.todoround.core.model

import java.time.Duration
import java.time.Instant

/*
 * The reminders of a task as the web shows them (src/utils/reminders.js, ReminderEditor.jsx):
 * minutes before the due, in their largest whole unit, the past ones struck through.
 */

enum class ReminderUnit { HOURS, DAYS, WEEKS }

/** A reminder in its largest whole unit: 2880 minutes are 2 days (reminderParts of the web). */
data class ReminderParts(val count: Int, val unit: ReminderUnit)

fun reminderParts(minutes: Int): ReminderParts = when {
    minutes % WEEK_MINUTES == 0 -> ReminderParts(minutes / WEEK_MINUTES, ReminderUnit.WEEKS)
    minutes % DAY_MINUTES == 0 -> ReminderParts(minutes / DAY_MINUTES, ReminderUnit.DAYS)
    else -> ReminderParts(minutes / HOUR_MINUTES, ReminderUnit.HOURS)
}

/** Whether the moment of the reminder [minutes] before [due] has passed at [now]; [zone] is the zone of the phone. */
fun reminderPassed(minutes: Int, due: Due, zone: String, now: Instant): Boolean =
    now > dueMoment(due, zone).minus(Duration.ofMinutes(minutes.toLong()))

private const val HOUR_MINUTES = 60
private const val DAY_MINUTES = 1440
private const val WEEK_MINUTES = 10080
