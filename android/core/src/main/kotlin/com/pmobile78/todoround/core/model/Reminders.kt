package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Limits
import java.time.Duration
import java.time.Instant

/*
 * The reminders of a task as the web shows and adds them (src/utils/reminders.js,
 * ReminderEditor.jsx): minutes before the due, in their largest whole unit, the past ones struck
 * through; 1 hour, 1 day, or a number of hours, days or weeks of the user's own.
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

/** The ready-made reminders of the form: 1 hour and 1 day before the due (REMINDER_PRESETS of the web). */
val REMINDER_PRESETS: List<Int> = listOf(HOUR_MINUTES, DAY_MINUTES)

/**
 * [count] of [unit] before the due in minutes, or null when [count], the digits as typed, is not a
 * whole number of them from 1 hour to 52 weeks (reminderMinutes of the web).
 */
fun reminderMinutes(count: String, unit: ReminderUnit): Int? {
    val number = count.toIntOrNull()?.takeIf { it >= 1 } ?: return null
    val minutes = number.toLong() * unit.minutes
    return if (minutes <= Limits.REMINDER_MAX_MINUTES) minutes.toInt() else null
}

/** [reminders] with [minutes] too, in order and without repeats; a list of 10 stays as it is (withReminder of the web). */
fun withReminder(reminders: List<Int>, minutes: Int): List<Int> =
    if (minutes in reminders || reminders.size >= Limits.MAX_REMINDERS) reminders else (reminders + minutes).sorted()

private val ReminderUnit.minutes: Int
    get() = when (this) {
        ReminderUnit.HOURS -> HOUR_MINUTES
        ReminderUnit.DAYS -> DAY_MINUTES
        ReminderUnit.WEEKS -> WEEK_MINUTES
    }

private const val HOUR_MINUTES = 60
private const val DAY_MINUTES = 1440
private const val WEEK_MINUTES = 10080
