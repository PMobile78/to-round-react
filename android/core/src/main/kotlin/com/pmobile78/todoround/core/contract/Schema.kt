package com.pmobile78.todoround.core.contract

/*
 * Data contract v2: shared constants, limits and the values of its enumerations.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md, section 3;
 * the web keeps the same in src/contract/schema.js.
 */

const val SCHEMA_VERSION = 2

const val DEFAULT_RADIUS = 45

/** The 20 category colours of contract/palette.json; a category's colour must be one of these. */
val PALETTE: List<String> = listOf(
    "#da3833", "#ee603c", "#fd8b2b", "#e9be00", "#b7be00",
    "#7db44e", "#46a549", "#00a47a", "#34c09d", "#007771",
    "#00a5cf", "#0089b5", "#005ea4", "#6179cf", "#434d82",
    "#b14dd1", "#c04097", "#f25e6a", "#4d697e", "#86a49c",
)

object Limits {
    const val ID_MAX_LENGTH = 128
    const val TITLE_MAX_LENGTH = 1000
    const val DESCRIPTION_MAX_LENGTH = 100_000
    const val CATEGORY_NAME_MAX_LENGTH = 100
    const val MAX_REMINDERS = 10
    const val REMINDER_STEP_MINUTES = 60
    const val REMINDER_MAX_MINUTES = 524_160
    const val REPEAT_EVERY_MAX = 999
    const val RADIUS_MIN = 30
    const val RADIUS_MAX = 80
    const val FONT_SIZE_MIN = 8
    const val FONT_SIZE_MAX = 20
}

/** A value of the contract kept as a string: [wire] is how Firestore and backups store it. */
interface WireValue {
    val wire: String
}

/** The constant of [E] stored as [wire], or null when there is none. */
inline fun <reified E> fromWire(wire: Any?): E? where E : Enum<E>, E : WireValue =
    enumValues<E>().firstOrNull { it.wire == wire }

enum class TaskStatus(override val wire: String) : WireValue {
    ACTIVE("active"), DONE("done"), DELETED("deleted"),
}

enum class RepeatUnit(override val wire: String) : WireValue {
    HOURS("hours"), DAYS("days"), WEEKS("weeks"), MONTHS("months"),
}

enum class ThemeMode(override val wire: String) : WireValue {
    LIGHT("light"), DARK("dark"), SYSTEM("system"),
}

enum class Design(override val wire: String) : WireValue {
    CLASSIC("classic"), MODERN("modern"), AURORA("aurora"), BRUTALIST("brutalist"), CLAY("clay"),
}

enum class Language(override val wire: String) : WireValue {
    EN("en"), UK("uk"),
}

enum class MainView(override val wire: String) : WireValue {
    BUBBLES("bubbles"), LIST("list"),
}

enum class SortField(override val wire: String) : WireValue {
    CREATED_AT("createdAt"), UPDATED_AT("updatedAt"), TITLE("title"), CATEGORY("category"),
}

enum class SortOrder(override val wire: String) : WireValue {
    ASC("asc"), DESC("desc"),
}
