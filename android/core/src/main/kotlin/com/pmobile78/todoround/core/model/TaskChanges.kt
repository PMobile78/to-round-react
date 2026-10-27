package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.isValidTimeZone
import java.time.Instant

/*
 * The changes of a task that the phone writes (stage 2 spec, sections 4 and 5), as the fields of
 * its record: the web's src/services/data/tasks.js writes the same.
 */

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
