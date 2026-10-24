package com.pmobile78.todoround.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
import com.pmobile78.todoround.core.contract.validateSettings
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.settingsFromRecord
import com.pmobile78.todoround.core.model.toRecord

/*
 * Firestore documents and backup-form records of data contract v2 (spec, section 6), as the web's
 * src/services/data/convert.js: the id becomes a field, Timestamps become ISO strings, and the
 * fields only the server writes (schemaVersion, overdueAt, nextNotifyAt; the times of a category)
 * stay out, else the core would refuse every document for an unknown field. A field the document
 * lacks stays missing: the core tells it from a field set to null.
 */

private val TASK_FIELDS = listOf(
    "title", "description", "categoryId", "status", "due", "reminders", "repeat", "radius", "pulseMuted",
)
private val TASK_TIMES = listOf("createdAt", "updatedAt", "deletedAt")
private val CATEGORY_FIELDS = listOf("name", "color", "order")

/** The record of the task document [id]; [data] is read with the server times estimated. */
fun taskRecord(id: String, data: Map<String, Any?>): Map<String, Any?> = buildMap {
    put("id", id)
    for (key in TASK_FIELDS) {
        if (key in data) put(key, data[key])
    }
    for (key in TASK_TIMES) {
        if (key in data) put(key, isoTime(data[key]))
    }
}

/** The record of the category document [id]. */
fun categoryRecord(id: String, data: Map<String, Any?>): Map<String, Any?> = buildMap {
    put("id", id)
    for (key in CATEGORY_FIELDS) {
        if (key in data) put(key, data[key])
    }
}

/** A Firestore time as an ISO string in UTC; anything else is left for the core to refuse. */
private fun isoTime(value: Any?): Any? = if (value is Timestamp) value.toInstant().toString() else value

/**
 * The settings of the user document [data] field by field, like the web's settingsFromUserDoc
 * (spec 6): a field without a value, or with one this version does not know (a design of a later
 * web, say), takes its default; the other fields are read as they are.
 */
fun settingsFromUserDoc(data: Map<String, Any?>?, screenLanguage: String?): Settings {
    val defaults = defaultSettings(screenLanguage).toRecord()
    @Suppress("UNCHECKED_CAST")
    val stored = data?.get("settings") as? Map<String, Any?> ?: emptyMap()
    val record = defaults.mapValues { (key, default) ->
        val value = stored[key]
        if (key in stored && validateSettings(defaults + (key to value)).isEmpty()) value else default
    }
    return settingsFromRecord(record)
}

/** A new users/{uid} (contract, section 3.4): schema 2, [settings] and the times of the server. */
fun newUserDoc(settings: Settings): Map<String, Any?> = mapOf(
    "schemaVersion" to SCHEMA_VERSION,
    "settings" to settings.toRecord(),
    "createdAt" to FieldValue.serverTimestamp(),
    "updatedAt" to FieldValue.serverTimestamp(),
)

/** The change of users/{uid} that writes [sort] as the list's sort (contract, 3.5). */
fun listSortUpdate(sort: ListSort): Map<String, Any?> = settingsUpdate("listSort", sort.toRecord())

/** The change of users/{uid} that writes [filter] as the list's filter (contract, 3.5). */
fun listFilterUpdate(filter: ListFilter): Map<String, Any?> = settingsUpdate("listFilter", filter.toRecord())

// As the web's settingsUpdateData: one setting by its field path, and the time of the server, so
// that two devices do not undo each other's changes of other settings.
private fun settingsUpdate(key: String, value: Any?): Map<String, Any?> =
    mapOf("settings.$key" to value, "updatedAt" to FieldValue.serverTimestamp())
