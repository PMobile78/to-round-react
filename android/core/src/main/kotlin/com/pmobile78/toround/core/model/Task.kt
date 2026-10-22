package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.contract.RepeatUnit
import com.pmobile78.toround.core.contract.TaskStatus
import com.pmobile78.toround.core.contract.fromWire
import com.pmobile78.toround.core.contract.validateTask
import java.time.Instant

/** The due of a task: wall-clock [local] ("YYYY-MM-DDTHH:mm") understood in zone [tz] (spec 4.2). */
data class Due(val local: String, val tz: String)

/** How a task repeats (spec 3.1, 4.3); [weekdays] are ISO days, 1 = Monday … 7 = Sunday. */
data class Repeat(
    val every: Int,
    val unit: RepeatUnit,
    val weekdays: List<Int>? = null,
    val monthDay: Int? = null,
)

/** A task of users/{uid}/tasks (spec 3.1) without the fields only the server writes. */
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val categoryId: String?,
    val status: TaskStatus,
    val due: Due?,
    val reminders: List<Int>,
    val repeat: Repeat?,
    val radius: Int,
    val pulseMuted: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant?,
)

/**
 * The task of a backup-form record; throws IllegalArgumentException with the errors of
 * validateTask when the record is not valid. [acceptUnknownZone] as in validateTask.
 */
fun taskFromRecord(record: Map<String, Any?>, acceptUnknownZone: Boolean = false): Task {
    val errors = validateTask(record, acceptUnknownZone)
    require(errors.isEmpty()) { "task ${record["id"]}: ${errors.joinToString("; ")}" }
    return Task(
        id = record.string("id"),
        title = record.string("title"),
        description = record.string("description"),
        categoryId = record.stringOrNull("categoryId"),
        status = fromWire<TaskStatus>(record["status"])!!,
        due = record.mapOrNull("due")?.let { Due(local = it.string("local"), tz = it.string("tz")) },
        reminders = record.ints("reminders"),
        repeat = record.mapOrNull("repeat")?.let {
            Repeat(
                every = it.int("every"),
                unit = fromWire<RepeatUnit>(it["unit"])!!,
                weekdays = if (it.containsKey("weekdays")) it.ints("weekdays") else null,
                monthDay = if (it.containsKey("monthDay")) it.int("monthDay") else null,
            )
        },
        radius = record.int("radius"),
        pulseMuted = record.boolean("pulseMuted"),
        createdAt = record.instant("createdAt"),
        updatedAt = record.instant("updatedAt"),
        deletedAt = record.instantOrNull("deletedAt"),
    )
}
