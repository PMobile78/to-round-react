package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.isValidTimeZone
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import java.time.Instant
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * The "Active" tab of the web's task list (spec, section 7; src/components/TaskList.jsx): which
 * tasks it shows, in which order, and how it writes a due.
 */

/** The [tasks] the list shows, in their order, and the number of [all] active tasks, those the filter hides included. */
data class ActiveList(val tasks: List<Task>, val all: Int)

/**
 * The active tasks, the planned ones too, that [filter] lets through, in the order of [sort]. A
 * task whose category is not among [categories] counts as one without a category.
 */
fun activeList(tasks: List<Task>, categories: List<Category>, filter: ListFilter, sort: ListSort): ActiveList {
    val known = categories.associateBy { it.id }
    val chosen = filter.categoryIds?.toSet()
    val active = tasks.filter { it.status == TaskStatus.ACTIVE }
    val shown = active.filter { task ->
        val category = task.categoryId?.let(known::get)
        if (category == null) filter.showUncategorized else chosen == null || category.id in chosen
    }
    return ActiveList(shown.sortedWith(listOrder(sort, known)), all = active.size)
}

// As the web compares: names without case (toLowerCase of JavaScript), times to the millisecond
// (Date). A tie keeps the order of the document ids, in which the web lists the tasks after a page
// load, whichever the direction. Ids compare as UTF-16 here and as UTF-8 in Firestore: the same
// order for ASCII ids, as the automatic ones and those of v1 are.
private fun listOrder(sort: ListSort, categories: Map<String, Category>): Comparator<Task> {
    val by: Comparator<Task> = when (sort.by) {
        SortField.TITLE -> compareBy { it.title.lowercase() }
        SortField.CATEGORY -> compareBy { task -> task.categoryId?.let(categories::get)?.name?.lowercase().orEmpty() }
        SortField.UPDATED_AT -> compareBy { it.updatedAt.toEpochMilli() }
        SortField.CREATED_AT -> compareBy { it.createdAt.toEpochMilli() }
    }
    return (if (sort.order == SortOrder.ASC) by else by.reversed()).thenBy { it.id }
}

/** A due as the list shows it: the date and time on this phone ("YYYY-MM-DDTHH:mm"), and whether its moment has passed. */
data class DueView(val local: String, val overdue: Boolean)

/**
 * [due] in [zone], the zone of this phone, at [now]. A due zone this phone does not know is shown
 * as written and is never overdue (spec 7): its moment is unknown here.
 */
fun dueView(due: Due, zone: String, now: Instant): DueView {
    if (!isValidTimeZone(due.tz)) return DueView(due.local, overdue = false)
    val moment = toInstant(due.local, due.tz)
    return DueView(toLocal(moment, zone), overdue = moment < now)
}

private val ENGLISH_DATE_TIME = DateTimeFormatter.ofPattern("MM/dd/uuuu, HH:mm", Locale.ROOT)
private val UKRAINIAN_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.uuuu, HH:mm", Locale.ROOT)

/** [local] ("YYYY-MM-DDTHH:mm") as the web's list writes it: "10/23/2026, 09:30" in English, "23.10.2026, 09:30" in Ukrainian. */
fun listDateTime(local: String, language: Language): String =
    LocalDateTime.parse(local).format(
        when (language) {
            Language.EN -> ENGLISH_DATE_TIME
            Language.UK -> UKRAINIAN_DATE_TIME
        },
    )
