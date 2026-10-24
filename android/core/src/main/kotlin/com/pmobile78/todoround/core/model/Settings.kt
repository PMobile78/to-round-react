package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Design
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.MainView
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.contract.fromWire
import com.pmobile78.todoround.core.contract.validateSettings

/** Which tasks the bubbles show; categoryIds null means every category. */
data class BubbleFilter(val categoryIds: List<String>?, val showUncategorized: Boolean, val plannedOnly: Boolean)

/** Which tasks the list shows; categoryIds null means every category. */
data class ListFilter(val categoryIds: List<String>?, val showUncategorized: Boolean)

data class ListSort(val by: SortField, val order: SortOrder)

/** The settings of users/{uid}.settings, shared by every device of the user (spec 3.5). */
data class Settings(
    val themeMode: ThemeMode,
    val design: Design,
    val language: Language,
    val mainView: MainView,
    val labelFontSize: Int,
    val bubbleBackground: Boolean,
    val showCategoriesPanel: Boolean,
    val showInstructions: Boolean,
    val bubbleFilter: BubbleFilter,
    val listFilter: ListFilter,
    val listSort: ListSort,
)

/** "uk*" → Ukrainian, anything else → English (spec 3.5). */
fun normalizeLanguage(tag: String?): Language =
    if (tag != null && tag.lowercase().startsWith("uk")) Language.UK else Language.EN

/** Fresh default settings (spec 3.5); the language comes from the device. */
fun defaultSettings(deviceLanguage: String?): Settings = Settings(
    themeMode = ThemeMode.SYSTEM,
    design = Design.CLASSIC,
    language = normalizeLanguage(deviceLanguage),
    mainView = MainView.BUBBLES,
    labelFontSize = 8,
    bubbleBackground = true,
    showCategoriesPanel = false,
    showInstructions = true,
    bubbleFilter = BubbleFilter(categoryIds = null, showUncategorized = true, plannedOnly = false),
    listFilter = ListFilter(categoryIds = null, showUncategorized = true),
    listSort = ListSort(by = SortField.UPDATED_AT, order = SortOrder.DESC),
)

/** The settings of a backup-form record; throws IllegalArgumentException when it is not valid. */
fun settingsFromRecord(record: Map<String, Any?>): Settings {
    val errors = validateSettings(record)
    require(errors.isEmpty()) { "settings: ${errors.joinToString("; ")}" }
    val bubbleFilter = record.map("bubbleFilter")
    val listFilter = record.map("listFilter")
    val listSort = record.map("listSort")
    return Settings(
        themeMode = fromWire<ThemeMode>(record["themeMode"])!!,
        design = fromWire<Design>(record["design"])!!,
        language = fromWire<Language>(record["language"])!!,
        mainView = fromWire<MainView>(record["mainView"])!!,
        labelFontSize = record.int("labelFontSize"),
        bubbleBackground = record.boolean("bubbleBackground"),
        showCategoriesPanel = record.boolean("showCategoriesPanel"),
        showInstructions = record.boolean("showInstructions"),
        bubbleFilter = BubbleFilter(
            categoryIds = bubbleFilter.stringsOrNull("categoryIds"),
            showUncategorized = bubbleFilter.boolean("showUncategorized"),
            plannedOnly = bubbleFilter.boolean("plannedOnly"),
        ),
        listFilter = ListFilter(
            categoryIds = listFilter.stringsOrNull("categoryIds"),
            showUncategorized = listFilter.boolean("showUncategorized"),
        ),
        listSort = ListSort(
            by = fromWire<SortField>(listSort["by"])!!,
            order = fromWire<SortOrder>(listSort["order"])!!,
        ),
    )
}

/** The record of these settings, as users/{uid}.settings and backups keep it; numbers are Long. */
fun Settings.toRecord(): Map<String, Any?> = mapOf(
    "themeMode" to themeMode.wire,
    "design" to design.wire,
    "language" to language.wire,
    "mainView" to mainView.wire,
    "labelFontSize" to labelFontSize.toLong(),
    "bubbleBackground" to bubbleBackground,
    "showCategoriesPanel" to showCategoriesPanel,
    "showInstructions" to showInstructions,
    "bubbleFilter" to mapOf(
        "categoryIds" to bubbleFilter.categoryIds,
        "showUncategorized" to bubbleFilter.showUncategorized,
        "plannedOnly" to bubbleFilter.plannedOnly,
    ),
    "listFilter" to listFilter.toRecord(),
    "listSort" to listSort.toRecord(),
)

/** The record of this filter, as settings.listFilter keeps it. */
fun ListFilter.toRecord(): Map<String, Any?> = mapOf("categoryIds" to categoryIds, "showUncategorized" to showUncategorized)

/** The record of this sort, as settings.listSort keeps it. */
fun ListSort.toRecord(): Map<String, Any?> = mapOf("by" to by.wire, "order" to order.wire)
