package com.pmobile78.toround.core.contract

import java.time.Instant
import java.time.format.DateTimeParseException

/*
 * Validation of plain (backup-form) v2 records with the rules and messages of the web's
 * src/contract/validate.js (spec, sections 3 and 10). A record is a map of plain values: String,
 * Boolean, Long or Double, lists, maps and null; times are ISO strings and the id is a field.
 * As in JavaScript, a missing field differs from a field set to null, and a number without a
 * fraction is an integer. Each validator returns the errors; an empty list means a valid record.
 */

// 0-9 fraction digits: java.time Instant.toString() writes 6 or 9 when the value has micro/nanoseconds.
private val ISO_RE = Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z""")

private val TASK_KEYS = setOf(
    "id", "title", "description", "categoryId", "status", "due", "reminders", "repeat",
    "radius", "pulseMuted", "createdAt", "updatedAt", "deletedAt",
)
private val CATEGORY_KEYS = setOf("id", "name", "color", "order")
private val SETTINGS_KEYS = setOf(
    "themeMode", "design", "language", "mainView", "labelFontSize", "bubbleBackground",
    "showCategoriesPanel", "showInstructions", "bubbleFilter", "listFilter", "listSort",
)

// The characters String.prototype.trim() removes in JavaScript: white space and line ends.
private val JS_SPACES: Set<Int> =
    setOf(0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF) +
        (0x2000..0x200A)

/** What a missing field reads as, so that it differs from a field set to null. */
private object Missing

private fun Map<*, *>.field(key: String): Any? = if (containsKey(key)) get(key) else Missing

private fun unknownKeys(record: Map<*, *>, allowed: Set<String>): List<Any?> = record.keys.filter { it !in allowed }

/** The value of a whole number (Long, Int, or a Double without a fraction), or null. */
private fun wholeNumber(value: Any?): Long? = when (value) {
    is Long -> value
    is Int -> value.toLong()
    is Double -> if (value % 1.0 == 0.0) value.toLong() else null
    else -> null
}

private fun isIntIn(value: Any?, min: Int, max: Int): Boolean = wholeNumber(value)?.let { it in min..max } ?: false

private fun isStrictlyAscending(numbers: List<*>): Boolean =
    numbers.zipWithNext().all { (a, b) -> (b as Number).toDouble() > (a as Number).toDouble() }

private fun isIsoTimestamp(value: Any?): Boolean {
    if (value !is String || !ISO_RE.matches(value)) return false
    return try {
        Instant.parse(value)
        true
    } catch (e: DateTimeParseException) {
        false
    }
}

private fun trimmedLengthIn(value: Any?, max: Int): Boolean {
    if (value !is String) return false
    val length = value.trim { it.code in JS_SPACES }.length
    return length in 1..max
}

/** Firestore-safe document id: 1..128 characters, no "/". */
fun isValidId(value: Any?): Boolean =
    value is String && value.isNotEmpty() && value.length <= Limits.ID_MAX_LENGTH && '/' !in value

private fun isIdListOrNull(value: Any?): Boolean = value == null || (value is List<*> && value.all(::isValidId))

private fun validateDue(due: Any?, acceptUnknownZone: Boolean, errors: MutableList<String>) {
    if (due == null) return
    if (due !is Map<*, *> || unknownKeys(due, setOf("local", "tz")).isNotEmpty()) {
        errors += "due: invalid shape"
        return
    }
    if (parseLocal(due.field("local")) == null) errors += "due.local: invalid"
    val tz = due.field("tz")
    val zoneOk = if (acceptUnknownZone) tz is String && tz.length in 1..64 else isValidTimeZone(tz)
    if (!zoneOk) errors += "due.tz: invalid"
}

private fun validateReminders(reminders: Any?, errors: MutableList<String>) {
    val ok = reminders is List<*> &&
        reminders.size <= Limits.MAX_REMINDERS &&
        reminders.all {
            isIntIn(it, Limits.REMINDER_STEP_MINUTES, Limits.REMINDER_MAX_MINUTES) &&
                wholeNumber(it)!! % Limits.REMINDER_STEP_MINUTES == 0L
        } &&
        isStrictlyAscending(reminders)
    if (!ok) errors += "reminders: invalid"
}

private fun validateRepeat(repeat: Any?, errors: MutableList<String>) {
    if (repeat == null) return
    if (repeat !is Map<*, *> || unknownKeys(repeat, setOf("every", "unit", "weekdays", "monthDay")).isNotEmpty()) {
        errors += "repeat: invalid shape"
        return
    }
    if (!isIntIn(repeat.field("every"), 1, Limits.REPEAT_EVERY_MAX)) errors += "repeat.every: invalid"
    val unit = fromWire<RepeatUnit>(repeat.field("unit"))
    if (unit == null) errors += "repeat.unit: invalid"
    if (repeat.containsKey("weekdays")) {
        val weekdays = repeat.field("weekdays")
        val ok = unit == RepeatUnit.WEEKS &&
            weekdays is List<*> &&
            weekdays.all { isIntIn(it, 1, 7) } &&
            isStrictlyAscending(weekdays)
        if (!ok) errors += "repeat.weekdays: invalid"
    }
    if (unit == RepeatUnit.MONTHS) {
        if (!isIntIn(repeat.field("monthDay"), 1, 31)) errors += "repeat.monthDay: required for months"
    } else if (repeat.containsKey("monthDay")) {
        errors += "repeat.monthDay: only for months"
    }
}

/**
 * Errors of a task record. A due zone this device does not know is an error unless
 * [acceptUnknownZone]: then any 1–64 characters pass, as the Firestore rules let them.
 */
fun validateTask(task: Any?, acceptUnknownZone: Boolean = false): List<String> {
    if (task !is Map<*, *>) return listOf("task: not an object")
    val errors = unknownKeys(task, TASK_KEYS).map { "$it: unknown field" }.toMutableList()
    if (!isValidId(task.field("id"))) errors += "id: invalid"
    if (!trimmedLengthIn(task.field("title"), Limits.TITLE_MAX_LENGTH)) errors += "title: invalid"
    val description = task.field("description")
    if (description !is String || description.length > Limits.DESCRIPTION_MAX_LENGTH) errors += "description: invalid"
    val categoryId = task.field("categoryId")
    if (categoryId != null && !isValidId(categoryId)) errors += "categoryId: invalid"
    val status = fromWire<TaskStatus>(task.field("status"))
    if (status == null) errors += "status: invalid"
    val due = task.field("due")
    val reminders = task.field("reminders")
    val repeat = task.field("repeat")
    validateDue(due, acceptUnknownZone, errors)
    validateReminders(reminders, errors)
    validateRepeat(repeat, errors)
    if (due == null && reminders is List<*> && reminders.isNotEmpty()) errors += "reminders: require due"
    if (due == null && repeat != null) errors += "repeat: requires due"
    if (!isIntIn(task.field("radius"), Limits.RADIUS_MIN, Limits.RADIUS_MAX)) errors += "radius: invalid"
    if (task.field("pulseMuted") !is Boolean) errors += "pulseMuted: invalid"
    if (!isIsoTimestamp(task.field("createdAt"))) errors += "createdAt: invalid"
    if (!isIsoTimestamp(task.field("updatedAt"))) errors += "updatedAt: invalid"
    val deletedAt = task.field("deletedAt")
    val deletedOk = if (status == TaskStatus.DELETED) isIsoTimestamp(deletedAt) else deletedAt == null
    if (!deletedOk) errors += "deletedAt: invalid"
    return errors
}

fun validateCategory(category: Any?): List<String> {
    if (category !is Map<*, *>) return listOf("category: not an object")
    val errors = unknownKeys(category, CATEGORY_KEYS).map { "$it: unknown field" }.toMutableList()
    if (!isValidId(category.field("id"))) errors += "id: invalid"
    if (!trimmedLengthIn(category.field("name"), Limits.CATEGORY_NAME_MAX_LENGTH)) errors += "name: invalid"
    if (category.field("color") !in PALETTE) errors += "color: not in palette"
    val order = category.field("order")
    val orderOk = order is Long || order is Int || (order is Double && order.isFinite())
    if (!orderOk) errors += "order: invalid"
    return errors
}

fun validateSettings(settings: Any?): List<String> {
    if (settings !is Map<*, *>) return listOf("settings: not an object")
    val errors = unknownKeys(settings, SETTINGS_KEYS).map { "$it: unknown field" }.toMutableList()
    if (fromWire<ThemeMode>(settings.field("themeMode")) == null) errors += "themeMode: invalid"
    if (fromWire<Design>(settings.field("design")) == null) errors += "design: invalid"
    if (fromWire<Language>(settings.field("language")) == null) errors += "language: invalid"
    if (fromWire<MainView>(settings.field("mainView")) == null) errors += "mainView: invalid"
    if (!isIntIn(settings.field("labelFontSize"), Limits.FONT_SIZE_MIN, Limits.FONT_SIZE_MAX)) {
        errors += "labelFontSize: invalid"
    }
    listOf("bubbleBackground", "showCategoriesPanel", "showInstructions").forEach { key ->
        if (settings.field(key) !is Boolean) errors += "$key: invalid"
    }
    val bubbleFilter = settings.field("bubbleFilter")
    if (bubbleFilter !is Map<*, *> ||
        unknownKeys(bubbleFilter, setOf("categoryIds", "showUncategorized", "plannedOnly")).isNotEmpty() ||
        !isIdListOrNull(bubbleFilter.field("categoryIds")) ||
        bubbleFilter.field("showUncategorized") !is Boolean ||
        bubbleFilter.field("plannedOnly") !is Boolean
    ) {
        errors += "bubbleFilter: invalid"
    }
    val listFilter = settings.field("listFilter")
    if (listFilter !is Map<*, *> ||
        unknownKeys(listFilter, setOf("categoryIds", "showUncategorized")).isNotEmpty() ||
        !isIdListOrNull(listFilter.field("categoryIds")) ||
        listFilter.field("showUncategorized") !is Boolean
    ) {
        errors += "listFilter: invalid"
    }
    val listSort = settings.field("listSort")
    if (listSort !is Map<*, *> ||
        unknownKeys(listSort, setOf("by", "order")).isNotEmpty() ||
        fromWire<SortField>(listSort.field("by")) == null ||
        fromWire<SortOrder>(listSort.field("order")) == null
    ) {
        errors += "listSort: invalid"
    }
    return errors
}
