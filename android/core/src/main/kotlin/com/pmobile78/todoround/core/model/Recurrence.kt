package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.formatLocal
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import java.time.Instant
import java.time.LocalDateTime
import java.time.YearMonth

/*
 * The next due of a repeating task (data contract v2, spec 4.3), as the web's
 * src/contract/recurrence.js finds it. `hours` steps in real time and skips the second pass of an
 * autumn hour; `days`, `weeks` and `months` step on the local calendar, and the day of a month
 * comes from the repeat's monthDay, not from the due.
 */

private const val HOUR_MS = 3_600_000L
private const val MAX_STEPS = 100_000

/** One step of [repeat] from [local] in zone [tz]: the next wall-clock "YYYY-MM-DDTHH:mm". */
fun stepOccurrence(local: String, tz: String, repeat: Repeat): String {
    val at = parseLocal(local) ?: throw IllegalArgumentException("Invalid local date-time: $local")
    return when (repeat.unit) {
        RepeatUnit.HOURS -> stepHours(local, tz, repeat.every)
        RepeatUnit.DAYS -> formatLocal(at.plusDays(repeat.every.toLong()))
        RepeatUnit.WEEKS -> formatLocal(
            if (repeat.weekdays.isNullOrEmpty()) at.plusDays(7L * repeat.every) else stepWeekdays(at, repeat.every, repeat.weekdays),
        )
        RepeatUnit.MONTHS -> formatLocal(stepMonths(at, repeat.every, requireNotNull(repeat.monthDay) { "monthDay is required for months" }))
    }
}

/** The first occurrence after [local] whose moment in zone [tz] is later than [now]. */
fun nextFutureOccurrence(local: String, tz: String, repeat: Repeat, now: Instant): String {
    val nowMs = now.toEpochMilli()
    if (repeat.unit == RepeatUnit.HOURS) {
        val stepMs = repeat.every * HOUR_MS
        var t = toInstant(local, tz).toEpochMilli()
        // Fast-forward to the last step at or before now; the result is the same as stepping one by one.
        if (t < nowMs) t += (nowMs - t) / stepMs * stepMs
        for (step in 1..MAX_STEPS) {
            t += stepMs
            val candidate = toLocal(Instant.ofEpochMilli(t), tz)
            if (t > nowMs && toInstant(candidate, tz).toEpochMilli() == t) return candidate
        }
        throw IllegalStateException("Hourly recurrence did not advance")
    }
    var current = local
    for (step in 1..MAX_STEPS) {
        current = stepOccurrence(current, tz, repeat)
        if (toInstant(current, tz).toEpochMilli() > nowMs) return current
    }
    throw IllegalStateException("Recurrence did not reach the future")
}

private fun stepHours(local: String, tz: String, every: Int): String {
    var t = toInstant(local, tz).toEpochMilli()
    for (step in 1..MAX_STEPS) {
        t += every * HOUR_MS
        val candidate = toLocal(Instant.ofEpochMilli(t), tz)
        // Skip instants whose wall-clock is ambiguous (second pass of a fall-back hour).
        if (toInstant(candidate, tz).toEpochMilli() == t) return candidate
    }
    throw IllegalStateException("Hourly recurrence did not advance")
}

// The next chosen day later in the week of [at], else the earliest one [every] weeks on; ISO days, Monday first.
private fun stepWeekdays(at: LocalDateTime, every: Int, weekdays: List<Int>): LocalDateTime {
    val days = weekdays.distinct().sorted()
    val current = at.dayOfWeek.value
    val laterThisWeek = days.firstOrNull { it > current }
    if (laterThisWeek != null) return at.plusDays((laterThisWeek - current).toLong())
    val weekStart = at.plusDays((1 - current).toLong())
    return weekStart.plusDays(7L * every + (days.first() - 1))
}

private fun stepMonths(at: LocalDateTime, every: Int, monthDay: Int): LocalDateTime {
    val month = YearMonth.from(at).plusMonths(every.toLong())
    return month.atDay(minOf(monthDay, month.lengthOfMonth())).atTime(at.toLocalTime())
}
