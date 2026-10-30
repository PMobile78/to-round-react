package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.DEFAULT_RADIUS
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.formatLocal
import com.pmobile78.todoround.core.contract.isValidTimeZone
import com.pmobile78.todoround.core.contract.jsTrim
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import com.pmobile78.todoround.core.contract.validateTask
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * The form of a task (stage 2 spec, sections 4 and 7), as the web's src/services/data/taskForm.js
 * reads its dialogs: the values the screen shows, the fields of a new task and the changes of an
 * edited one. The due of the form is the date and time the pickers show on this phone, in its
 * zone; a new or changed due is written in that zone, or in UTC with the same moment when the base
 * of java.time does not know it (2.2 №5).
 */

/**
 * The values of the form. [due] is the "YYYY-MM-DDTHH:mm" the pickers show on this phone, or null;
 * [repeat] is as the repeat editor leaves it, its monthDay unused; [categoryId] null is "No category".
 */
data class TaskForm(
    val title: String,
    val description: String,
    val categoryId: String?,
    val due: String?,
    val reminders: List<Int>,
    val repeat: Repeat?,
    val radius: Int,
)

/** The form of a new task: no category, no due, the size 45 (spec, section 7). */
val NEW_TASK_FORM = TaskForm(
    title = "",
    description = "",
    categoryId = null,
    due = null,
    reminders = emptyList(),
    repeat = null,
    radius = DEFAULT_RADIUS,
)

/** The repeat a switched-on repeat starts with: every 1 day (RepeatEditor of the web). */
val NEW_REPEAT = Repeat(every = 1, unit = RepeatUnit.DAYS)

/** The form of this task as it opens on a phone in [zone]: its due as the phone shows it (dueForPicker of the web). */
fun Task.toForm(zone: String): TaskForm = TaskForm(
    title = title,
    description = description,
    categoryId = categoryId,
    due = due?.let { toLocal(dueMoment(it, zone), zone) },
    reminders = reminders,
    repeat = repeat,
    radius = radius,
)

/** Whether the form can be saved, as the web's dialog lets it: a title, and a description of at most 100 000 characters. */
fun TaskForm.canSave(): Boolean = jsTrim(title).isNotEmpty() && description.length <= Limits.DESCRIPTION_MAX_LENGTH

/** The form without its due: "Clear" takes the reminders and the repeat with it (spec, section 7). */
fun TaskForm.withoutDue(): TaskForm = copy(due = null, reminders = emptyList(), repeat = null)

/** The zone a new or changed due is written in (2.2 №5): [zone], the zone of the phone, or UTC when the base does not know it. */
fun writeZone(zone: String): String = if (isValidTimeZone(zone)) zone else UTC

/** The fields of a new task from [form] on a phone in [zone] (taskFieldsFromForm of the web), as its record keeps them. */
fun newTaskFields(form: TaskForm, zone: String): Map<String, Any?> {
    val due = form.due?.let { newDue(it, zone) }
    return mapOf(
        "title" to jsTrim(form.title),
        "description" to form.description,
        "categoryId" to form.categoryId,
        "due" to due?.toRecord(),
        "reminders" to storedReminders(form.reminders, due).map(Int::toLong),
        "repeat" to storedRepeat(form.repeat, due, monthDay = null)?.toRecord(),
        "radius" to form.radius.toLong(),
    )
}

/**
 * The errors of the record the new task [id] with [fields] would have, made at [now] (2.2 №16): a
 * new task is active, pulses and is not deleted (spec, section 5).
 */
fun newTaskErrors(id: String, fields: Map<String, Any?>, now: Instant): List<String> = validateTask(
    fields + mapOf(
        "id" to id,
        "status" to TaskStatus.ACTIVE.wire,
        "pulseMuted" to false,
        "createdAt" to now.toString(),
        "updatedAt" to now.toString(),
        "deletedAt" to null,
    ),
)

/**
 * The changes [form] makes to [task], the task as the form opened on it (taskChangesFromForm of the
 * web; 2.2 №15): only the fields that differ from it. The due stays, and its zone with it, while the
 * form shows the time it showed when it opened ([opened]), also on a phone in another zone or with
 * a zone this phone does not know; a changed due takes the zone of the phone (writeZone) and lets a
 * muted task pulse again.
 */
fun formChanges(task: Task, opened: TaskForm, form: TaskForm, zone: String): Map<String, Any?> {
    val dueChanged = form.due != opened.due
    val due = if (dueChanged) form.due?.let { newDue(it, zone) } else task.due
    // "Done" may have moved a day-31 task to the 28th: while the due stays, so does the month day.
    val keptMonthDay = if (!dueChanged && task.repeat?.unit == RepeatUnit.MONTHS) task.repeat.monthDay else null
    val title = jsTrim(form.title)
    val reminders = storedReminders(form.reminders, due)
    val repeat = storedRepeat(form.repeat, due, keptMonthDay)
    return buildMap {
        if (title != task.title) put("title", title)
        if (form.description != task.description) put("description", form.description)
        if (form.categoryId != task.categoryId) put("categoryId", form.categoryId)
        if (due != task.due) put("due", due?.toRecord())
        if (reminders != task.reminders) put("reminders", reminders.map(Int::toLong))
        if (repeat != task.repeat) put("repeat", repeat?.toRecord())
        if (form.radius != task.radius) put("radius", form.radius.toLong())
        if (dueChanged && task.pulseMuted) put("pulseMuted", false)
    }
}

/** "Every" as typed: a whole number from 1 to 999, else null, and the repeat keeps its number (RepeatEditor of the web). */
fun repeatEvery(text: String): Int? = text.toIntOrNull()?.takeIf { it in 1..Limits.REPEAT_EVERY_MAX }

/** This repeat with the ISO weekday [day] chosen, or no longer chosen; the days stay in order (RepeatEditor of the web). */
fun Repeat.toggledWeekday(day: Int): Repeat {
    val days = weekdays.orEmpty()
    return copy(weekdays = if (day in days) days.filter { it != day } else (days + day).sorted())
}

/**
 * The day a date picker of Material 3 means by [utcMillis], the start of that day in UTC: the day is
 * read in UTC, not in the zone of the phone, where it would be the day before west of Greenwich
 * (spec, section 15).
 */
fun pickedDate(utcMillis: Long): LocalDate = Instant.ofEpochMilli(utcMillis).atOffset(ZoneOffset.UTC).toLocalDate()

/** What a date picker of Material 3 takes for [date]: the start of that day in UTC. */
fun pickerMillis(date: LocalDate): Long = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

/** The due of the form on [date] at [hour]:[minute]. */
fun pickedDue(date: LocalDate, hour: Int, minute: Int): String = formatLocal(LocalDateTime.of(date, LocalTime.of(hour, minute)))

/** [local] ("YYYY-MM-DDTHH:mm") as the web's date picker writes it: "10/23/2026 09:30" in English, "23.10.2026 09:30" in Ukrainian. */
fun formDateTime(local: String, language: Language): String =
    LocalDateTime.parse(local).format(
        when (language) {
            Language.EN -> ENGLISH_PICKER
            Language.UK -> UKRAINIAN_PICKER
        },
    )

private const val UTC = "UTC"

private val ENGLISH_PICKER = DateTimeFormatter.ofPattern("MM/dd/uuuu HH:mm", Locale.ROOT)
private val UKRAINIAN_PICKER = DateTimeFormatter.ofPattern("dd.MM.uuuu HH:mm", Locale.ROOT)

// The due of the form as it is written: the moment the pickers mean on this phone, in the zone of writeZone.
private fun newDue(local: String, zone: String): Due {
    val tz = writeZone(zone)
    return Due(toLocal(toInstant(local, zone), tz), tz)
}

// Whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10; none without a due.
private fun storedReminders(reminders: List<Int>, due: Due?): List<Int> =
    if (due == null) {
        emptyList()
    } else {
        reminders.distinct()
            .filter { it in Limits.REMINDER_STEP_MINUTES..Limits.REMINDER_MAX_MINUTES && it % Limits.REMINDER_STEP_MINUTES == 0 }
            .sorted()
            .take(Limits.MAX_REMINDERS)
    }

// Every 1–999; ISO weekdays only for weeks and only when some are chosen; the month day of a monthly
// repeat is [monthDay] (the task's, kept while its due stays) or the day of the due (spec 4.2).
private fun storedRepeat(repeat: Repeat?, due: Due?, monthDay: Int?): Repeat? {
    if (repeat == null || due == null) return null
    val weekdays = if (repeat.unit == RepeatUnit.WEEKS) repeat.weekdays?.distinct()?.filter { it in 1..7 }?.sorted()?.ifEmpty { null } else null
    val day = if (repeat.unit == RepeatUnit.MONTHS) monthDay ?: parseLocal(due.local)!!.dayOfMonth else null
    return Repeat(repeat.every.coerceIn(1, Limits.REPEAT_EVERY_MAX), repeat.unit, weekdays, day)
}
