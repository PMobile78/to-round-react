package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.isValidTimeZone
import com.pmobile78.todoround.core.contract.validateTask
import java.time.Instant

/*
 * The changes of a task that the phone writes (stage 2 spec, sections 4 and 5), as the fields of
 * its record: the web's src/services/data/tasks.js writes the same. The app adds updatedAt with the
 * time of the server and writes ServerTime as it.
 */

/** Stands for the time of the server in a change; the app writes serverTimestamp() for it. */
data object ServerTime

/** What can be done to a task, as the web's buttons do it (stage 2 spec, 2.2 №12). */
enum class TaskAction { DONE, FINISH_SERIES, DELETE, RESTORE, DELETE_FOREVER }

/**
 * The actions of this task by its status, in the order of the web's buttons (TaskActionButtons.jsx):
 * the first is the button of its row, the others are in its menu (2.2 №10). "Finish series" is for a
 * repeating task only.
 */
fun Task.actions(): List<TaskAction> = when (status) {
    TaskStatus.ACTIVE -> listOfNotNull(TaskAction.DONE, TaskAction.FINISH_SERIES.takeIf { repeat != null }, TaskAction.DELETE)
    TaskStatus.DONE -> listOf(TaskAction.RESTORE, TaskAction.DELETE)
    TaskStatus.DELETED -> listOf(TaskAction.RESTORE, TaskAction.DELETE_FOREVER)
}

/**
 * The changes [action] writes to [task] at [now], in [zone], the zone of the phone; null for
 * "Delete forever", which removes the document instead.
 */
fun TaskAction.changes(task: Task, zone: String, now: Instant): Map<String, Any?>? = when (this) {
    TaskAction.DONE -> completionChanges(task, zone, now)
    TaskAction.FINISH_SERIES -> mapOf("status" to TaskStatus.DONE.wire)
    TaskAction.DELETE -> mapOf("status" to TaskStatus.DELETED.wire, "deletedAt" to ServerTime)
    TaskAction.RESTORE -> mapOf("status" to TaskStatus.ACTIVE.wire, "deletedAt" to null)
    TaskAction.DELETE_FOREVER -> null
}

/**
 * "Done" (contract 4.1; completionChanges of the web): a one-off task becomes done; a repeating one
 * stays active with its next due after [now], written in the zone of the due, and pulses again. A
 * due zone this phone does not know steps in [zone], the zone of the phone, where its due is read
 * (stage 2 spec, 2.2 №4); the web cannot step such a due at all.
 */
fun completionChanges(task: Task, zone: String, now: Instant): Map<String, Any?> {
    val due = task.due
    val repeat = task.repeat
    if (repeat == null || due == null) return mapOf("status" to TaskStatus.DONE.wire)
    val next = nextFutureOccurrence(due.local, if (isValidTimeZone(due.tz)) due.tz else zone, repeat, now)
    return buildMap {
        put("due", mapOf("local" to next, "tz" to due.tz))
        if (task.pulseMuted) put("pulseMuted", false)
    }
}

/** The new [description] of a task: a checkbox ticked or unticked (2.2 №2). */
fun descriptionChanges(description: String): Map<String, Any?> = mapOf("description" to description)

/**
 * The errors of the task that [changes] leave (stage 2 spec, 2.2 №16): validateTask of its record
 * after them, with [now] for the times of the server. A due zone the changes keep passes even when
 * this phone does not know it, as when the task was read.
 */
fun changeErrors(task: Task, changes: Map<String, Any?>, now: Instant): List<String> {
    val record = task.toRecord() + changes.mapValues { (_, value) -> if (value == ServerTime) now.toString() else value } +
        ("updatedAt" to now.toString())
    @Suppress("UNCHECKED_CAST")
    val zoneKept = (record["due"] as Map<String, Any?>?)?.get("tz") == task.due?.tz
    return validateTask(record, acceptUnknownZone = zoneKept)
}

/** The record of this task, as backups keep it: the form validateTask checks. Whole numbers are Long. */
fun Task.toRecord(): Map<String, Any?> = mapOf(
    "id" to id,
    "title" to title,
    "description" to description,
    "categoryId" to categoryId,
    "status" to status.wire,
    "due" to due?.toRecord(),
    "reminders" to reminders.map(Int::toLong),
    "repeat" to repeat?.toRecord(),
    "radius" to radius.toLong(),
    "pulseMuted" to pulseMuted,
    "createdAt" to createdAt.toString(),
    "updatedAt" to updatedAt.toString(),
    "deletedAt" to deletedAt?.toString(),
)

/** The record of this due, as tasks keep it. */
internal fun Due.toRecord(): Map<String, Any?> = mapOf("local" to local, "tz" to tz)

/** The record of this repeat, as tasks keep it: weekdays and monthDay only when it has them. Whole numbers are Long. */
internal fun Repeat.toRecord(): Map<String, Any?> = buildMap {
    put("every", every.toLong())
    put("unit", unit.wire)
    weekdays?.let { put("weekdays", it.map(Int::toLong)) }
    monthDay?.let { put("monthDay", it.toLong()) }
}
