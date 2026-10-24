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
 * The task list of the web (src/components/TaskList.jsx; stage 2 spec, section 4): its tabs, the
 * saved filter and sort, the search, the numbers of the tabs and of the filter panel, and how the
 * list writes a due and a date.
 */

/** The tabs of the web's list, in its order. */
enum class ListTab { ACTIVE, DONE, DELETED, PLANNED }

/** What the list shows: a [tab], the saved [filter] and [sort], and the search [query] as typed. */
data class ListOptions(val tab: ListTab, val filter: ListFilter, val sort: ListSort, val query: String)

/**
 * Whether [task] belongs to this tab at [now]; [zone] is the zone of the phone. "Planned" holds
 * the active tasks whose due is still ahead (src/utils/bubbleStatus.js).
 */
fun ListTab.holds(task: Task, zone: String, now: Instant): Boolean = when (this) {
    ListTab.ACTIVE -> task.status == TaskStatus.ACTIVE
    ListTab.DONE -> task.status == TaskStatus.DONE
    ListTab.DELETED -> task.status == TaskStatus.DELETED
    ListTab.PLANNED -> task.status == TaskStatus.ACTIVE && task.due != null && dueMoment(task.due, zone) > now
}

/**
 * Whether [task] matches the search [query] as in the web's useSearch.js: the query without the
 * spaces around it and without case, in the title, in the description or in the name of its
 * [category]; an empty query matches every task. The web reads a description with "<" or "&" as
 * HTML first, the phone reads it as written (stage 2 spec, section 4).
 */
fun matches(task: Task, category: Category?, query: String): Boolean {
    val text = query.trim().lowercase()
    return text.isEmpty() ||
        text in task.title.lowercase() ||
        text in task.description.lowercase() ||
        category != null && text in category.name.lowercase()
}

/** Whether this filter lets through a task of [category]: null when it has none or it is gone. */
fun ListFilter.passes(category: Category?): Boolean =
    if (category == null) showUncategorized else categoryIds == null || category.id in categoryIds

/**
 * The tasks of the tab of [options] that its filter and search let through, in the order of its
 * sort. A task whose category is not among [categories] counts as one without a category.
 */
fun tabTasks(tasks: List<Task>, categories: List<Category>, options: ListOptions, zone: String, now: Instant): List<Task> {
    val known = categories.associateBy { it.id }
    return tasks
        .filter { task ->
            val category = task.categoryId?.let(known::get)
            options.tab.holds(task, zone, now) && options.filter.passes(category) && matches(task, category, options.query)
        }
        .sortedWith(listOrder(options.sort, known))
}

/** The number in the name of each tab: its tasks that [filter] and [query] let through (getTasksCountByStatus). */
fun tabCounts(
    tasks: List<Task>,
    categories: List<Category>,
    filter: ListFilter,
    query: String,
    zone: String,
    now: Instant,
): Map<ListTab, Int> {
    val known = categories.associateBy { it.id }
    val shown = tasks.filter { task ->
        val category = task.categoryId?.let(known::get)
        filter.passes(category) && matches(task, category, query)
    }
    return ListTab.entries.associateWith { tab -> shown.count { tab.holds(it, zone, now) } }
}

/**
 * The numbers of the filter panel: the tasks of [tab] that [query] lets through, by the id of
 * their category, and under null those without a category or with one that is gone
 * (countBubblesByTagForListView of src/utils/listVisibility.js).
 */
fun filterCounts(
    tasks: List<Task>,
    categories: List<Category>,
    tab: ListTab,
    query: String,
    zone: String,
    now: Instant,
): Map<String?, Int> {
    val known = categories.associateBy { it.id }
    return tasks
        .filter { task -> tab.holds(task, zone, now) && matches(task, task.categoryId?.let(known::get), query) }
        .groupingBy { task -> task.categoryId?.takeIf { it in known } }
        .eachCount()
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

/** The filter that shows every task: every category and the tasks without one ("Select All"). */
val SHOW_ALL = ListFilter(categoryIds = null, showUncategorized = true)

/** The filter that shows no task ("Clear All"). */
val SHOW_NONE = ListFilter(categoryIds = emptyList(), showUncategorized = false)

/**
 * The categories the filter panel shows as chosen: every one of [categories] for null, in their
 * order; of a list, those that still exist, in its order (selectedTagIds of src/state/settingsView.js).
 */
fun ListFilter.chosen(categories: List<Category>): List<String> {
    val ids = categories.map { it.id }
    return categoryIds?.filter { it in ids } ?: ids
}

/**
 * This filter with [categoryId] chosen or not. With every category chosen, the filter keeps null,
 * so that categories made later show too (toggleTagInFilter and categoryIdsFor of the web).
 */
fun ListFilter.toggled(categoryId: String, categories: List<Category>): ListFilter {
    val current = chosen(categories)
    val next = if (categoryId in current) current.filter { it != categoryId } else current + categoryId
    return copy(categoryIds = if (categories.isNotEmpty() && categories.all { it.id in next }) null else next)
}

/** This filter with the tasks without a category shown or not. */
fun ListFilter.toggledUncategorized(): ListFilter = copy(showUncategorized = !showUncategorized)

/** Whether this filter hides some tasks: those of a category not chosen, or those without one. */
fun ListFilter.hidesSome(categories: List<Category>): Boolean =
    !showUncategorized || categoryIds != null && categories.any { it.id !in categoryIds }

/** [categories] by their order, a tie by id, as every device shows them (sortCategories of the web). */
fun inOrder(categories: List<Category>): List<Category> = categories.sortedWith(compareBy<Category> { it.order }.thenBy { it.id })

/** A due as the list shows it: the date and time on this phone ("YYYY-MM-DDTHH:mm"), and whether its moment has passed. */
data class DueView(val local: String, val overdue: Boolean)

/** [due] in [zone], the zone of this phone, at [now]. */
fun dueView(due: Due, zone: String, now: Instant): DueView {
    val moment = dueMoment(due, zone)
    return DueView(toLocal(moment, zone), overdue = moment < now)
}

/**
 * The moment of [due]: its local time in its zone. A zone this phone does not know reads the time
 * in [zone], the zone of this phone, as the web does (src/services/data/bubbleModel.js; stage 2
 * spec, 2.2 №4).
 */
fun dueMoment(due: Due, zone: String): Instant = toInstant(due.local, if (isValidTimeZone(due.tz)) due.tz else zone)

/** Whether the task was changed after it was made: the web shows "Updated" then, comparing the times to the millisecond. */
fun Task.changedAfterCreation(): Boolean = updatedAt.toEpochMilli() != createdAt.toEpochMilli()

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

/** A time of a record, such as createdAt, as the list writes it in [zone], the zone of this phone. */
fun listDateTime(moment: Instant, zone: String, language: Language): String = listDateTime(toLocal(moment, zone), language)
