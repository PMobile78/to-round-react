package com.pmobile78.todoround.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListOptions
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.ListTab
import com.pmobile78.todoround.core.model.SHOW_ALL
import com.pmobile78.todoround.core.model.SHOW_NONE
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.actions
import com.pmobile78.todoround.core.model.changedAfterCreation
import com.pmobile78.todoround.core.model.chosen
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.filterCounts
import com.pmobile78.todoround.core.model.hidesSome
import com.pmobile78.todoround.core.model.inOrder
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.tabCounts
import com.pmobile78.todoround.core.model.tabTasks
import com.pmobile78.todoround.core.model.toggled
import com.pmobile78.todoround.core.model.toggledUncategorized
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.DoneGreen
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import java.time.Clock
import java.time.Instant

/**
 * The screen of a signed-in user: the top bar with the menu "Logout" and the task list of the web
 * with its tabs, search, sort and category filter (stage 2 spec, section 6). It follows the data
 * live. The sort and the filter are settings of the account, shared with the web: [onSort] and
 * [onFilter] write them, and a write the server refused comes out of [writeFailures]. A row opens
 * its task ([onOpen]) and does the actions of its status ([onAction]); [taskGone] tells that the
 * screen of a task closed because the task is no longer there. [clock] tells the time.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    session: Session.SignedIn,
    onSignOut: () -> Unit,
    onSort: (ListSort) -> Unit = {},
    onFilter: (ListFilter) -> Unit = {},
    writeFailures: Flow<Unit> = emptyFlow(),
    onOpen: (String) -> Unit = {},
    onAction: (Task, TaskAction) -> Unit = { _, _ -> },
    taskGone: Flow<Unit> = emptyFlow(),
    clock: Clock = Clock.systemUTC(),
) {
    var menu by remember { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    val gone = stringResource(R.string.task_gone)
    LaunchedEffect(writeFailures) {
        writeFailures.collect { snackbars.showSnackbar(notSaved) }
    }
    LaunchedEffect(taskGone) {
        taskGone.collect { snackbars.showSnackbar(gone) }
    }
    Scaffold(
        modifier = Modifier.testTag("home"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = {
                    IconButton(onClick = { menu = true }, modifier = Modifier.testTag("menu")) {
                        Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.menu))
                    }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.auth_logout)) },
                            onClick = {
                                menu = false
                                confirmSignOut = true
                            },
                            modifier = Modifier.testTag("logout"),
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbars) },
    ) { padding ->
        val data = session.data
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding(),
        ) {
            when {
                session.failed -> Note(stringResource(R.string.list_failed), MaterialTheme.colorScheme.error, "failed", Modifier.padding(16.dp))
                data == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskList(data, onSort, onFilter, onOpen, onAction, clock)
            }
        }
    }
    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(R.string.auth_logout_confirm)) },
            text = { Text(stringResource(R.string.auth_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmSignOut = false
                        onSignOut()
                    },
                    modifier = Modifier.testTag("logout_confirm"),
                ) {
                    Text(stringResource(R.string.auth_approve_logout))
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

/**
 * The list of the web: the search, the filter and the sort over the tabs, then the tasks of the
 * chosen tab with the notes about the data. The tab and the search stay on this phone; the
 * search follows the field 300 ms after the last key, as on the web (stage 2 spec, 2.2 №6, №8).
 */
@Composable
private fun TaskList(
    data: UserData,
    onSort: (ListSort) -> Unit,
    onFilter: (ListFilter) -> Unit,
    onOpen: (String) -> Unit,
    onAction: (Task, TaskAction) -> Unit,
    clock: Clock,
) {
    val settings = data.settings
    var tab by rememberSaveable { mutableStateOf(ListTab.ACTIVE) }
    var typed by rememberSaveable { mutableStateOf("") }
    var query by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(typed) {
        delay(300)
        query = typed
    }
    var filtering by rememberSaveable { mutableStateOf(false) }
    val zone = deviceTimeZone()
    val now = currentMinute(clock)
    val categories = remember(data) { inOrder(data.categories.items) }
    val known = remember(categories) { categories.associateBy { it.id } }
    val options = ListOptions(tab, settings.listFilter, settings.listSort, query)
    val tasks = remember(data, options, now) { tabTasks(data.tasks.items, categories, options, zone, now) }
    val counts = remember(data, query, now) { tabCounts(data.tasks.items, categories, settings.listFilter, query, zone, now) }
    Column(modifier = Modifier.fillMaxSize()) {
        SearchField(typed, onChange = { typed = it })
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FilterButton(hidesSome = settings.listFilter.hidesSome(categories), onClick = { filtering = true })
            Spacer(Modifier.weight(1f))
            SortControls(settings.listSort, onSort)
        }
        PrimaryScrollableTabRow(selectedTabIndex = tab.ordinal, edgePadding = 16.dp) {
            ListTab.entries.forEach { each ->
                Tab(
                    selected = each == tab,
                    onClick = { tab = each },
                    text = { Text(stringResource(each.label, counts[each] ?: 0)) },
                    modifier = Modifier.testTag("tab_${each.name.lowercase()}"),
                )
            }
        }
        // Another tab, sort or search starts the list at its top. The rows have no keys: after a
        // change of the data the list keeps its place by position, as the web's list does, and does
        // not follow the row that was first to wherever it moved.
        key(tab, settings.listSort, query) {
            TaskRows(data, tasks, tab, known, zone, now, onOpen, onAction)
        }
    }
    if (filtering) {
        val numbers = remember(data, tab, query, now) { filterCounts(data.tasks.items, categories, tab, query, zone, now) }
        FilterSheet(categories, settings.listFilter, numbers, onFilter, onDismiss = { filtering = false })
    }
}

/**
 * The rows of [tasks] under the notes about the data, the note of the trash and the text of an empty
 * tab. The rows hold no state of their own: the open menu and the question before "Delete forever"
 * belong to a task by its id, so neither moves to another task when the data change under them.
 */
@Composable
private fun TaskRows(
    data: UserData,
    tasks: List<Task>,
    tab: ListTab,
    categories: Map<String, Category>,
    zone: String,
    now: Instant,
    onOpen: (String) -> Unit,
    onAction: (Task, TaskAction) -> Unit,
) {
    val invalid = data.tasks.invalid + data.categories.invalid
    val offline = data.tasks.fromCache || data.categories.fromCache
    var menuOf by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmForeverOf by rememberSaveable { mutableStateOf<String?>(null) }
    // A menu or a question whose task left the tab goes with it, and does not open again when the task comes back.
    LaunchedEffect(tasks) {
        if (tasks.none { it.id == menuOf }) menuOf = null
        if (tasks.none { it.id == confirmForeverOf }) confirmForeverOf = null
    }
    LazyColumn(
        state = rememberLazyListState(),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (invalid > 0 || offline) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (invalid > 0) Note(stringResource(R.string.list_invalid, invalid), MaterialTheme.colorScheme.error, "invalid")
                    if (offline) Note(stringResource(R.string.list_offline), MaterialTheme.colorScheme.onSurfaceVariant, "offline")
                }
            }
        }
        if (tab == ListTab.DELETED) {
            item { Note(stringResource(R.string.list_trash_note), MaterialTheme.colorScheme.onSurfaceVariant, "trash_note") }
        }
        if (tasks.isEmpty()) {
            item { Note(stringResource(tab.empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
        }
        items(tasks) { task ->
            TaskRow(
                task = task,
                category = task.categoryId?.let(categories::get),
                language = data.settings.language,
                zone = zone,
                now = now,
                menuOpen = menuOf == task.id,
                onMenu = { open -> menuOf = if (open) task.id else null },
                onOpen = { onOpen(task.id) },
                onAction = { action -> if (action == TaskAction.DELETE_FOREVER) confirmForeverOf = task.id else onAction(task, action) },
            )
        }
    }
    val confirming = confirmForeverOf?.let { id -> tasks.firstOrNull { it.id == id } }
    if (confirming != null) {
        DeleteForeverDialog(
            onConfirm = {
                confirmForeverOf = null
                onAction(confirming, TaskAction.DELETE_FOREVER)
            },
            onDismiss = { confirmForeverOf = null },
        )
    }
}

@get:StringRes
private val ListTab.label: Int
    get() = when (this) {
        ListTab.ACTIVE -> R.string.list_tab_active
        ListTab.DONE -> R.string.list_tab_done
        ListTab.DELETED -> R.string.list_tab_deleted
        ListTab.PLANNED -> R.string.list_tab_planned
    }

@get:StringRes
private val ListTab.empty: Int
    get() = when (this) {
        ListTab.ACTIVE -> R.string.list_empty_active
        ListTab.DONE -> R.string.list_empty_done
        ListTab.DELETED -> R.string.list_empty_deleted
        ListTab.PLANNED -> R.string.list_empty_planned
    }

@get:StringRes
private val SortField.label: Int
    get() = when (this) {
        SortField.CREATED_AT -> R.string.list_sort_created
        SortField.UPDATED_AT -> R.string.list_sort_updated
        SortField.TITLE -> R.string.list_sort_title
        SortField.CATEGORY -> R.string.list_sort_category
    }

@Composable
private fun SearchField(typed: String, onChange: (String) -> Unit) {
    val focus = LocalFocusManager.current
    OutlinedTextField(
        value = typed,
        onValueChange = onChange,
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
        placeholder = { Text(stringResource(R.string.list_search)) },
        leadingIcon = { Icon(painterResource(R.drawable.ic_search), contentDescription = null) },
        trailingIcon = {
            if (typed.isNotEmpty()) {
                IconButton(onClick = { onChange("") }, modifier = Modifier.testTag("search_clear")) {
                    Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.list_search_clear))
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .testTag("search"),
    )
}

/** The button of the filter panel, marked as the web marks it when the filter hides some tasks. */
@Composable
private fun FilterButton(hidesSome: Boolean, onClick: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    OutlinedButton(
        onClick = onClick,
        colors = if (hidesSome) {
            ButtonDefaults.outlinedButtonColors(containerColor = primary.copy(alpha = 0.15f), contentColor = primary)
        } else {
            ButtonDefaults.outlinedButtonColors()
        },
        border = BorderStroke(1.dp, if (hidesSome) primary else MaterialTheme.colorScheme.outline),
        modifier = Modifier
            .testTag("filter")
            .semantics { selected = hidesSome },
    ) {
        Icon(painterResource(R.drawable.ic_filter_list), contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text(stringResource(R.string.list_filter))
    }
}

/** The field and the direction of the sort; a change goes to [onSort]. */
@Composable
private fun SortControls(sort: ListSort, onSort: (ListSort) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { open = true }, modifier = Modifier.testTag("sort")) {
            Text(stringResource(R.string.list_sort_by, stringResource(sort.by.label)))
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            SortField.entries.forEach { field ->
                DropdownMenuItem(
                    text = { Text(stringResource(field.label)) },
                    onClick = {
                        open = false
                        if (field != sort.by) onSort(sort.copy(by = field))
                    },
                    modifier = Modifier.testTag("sort_${field.wire}"),
                )
            }
        }
    }
    val ascending = sort.order == SortOrder.ASC
    IconButton(
        onClick = { onSort(sort.copy(order = if (ascending) SortOrder.DESC else SortOrder.ASC)) },
        modifier = Modifier.testTag("sort_order"),
    ) {
        Icon(
            painterResource(if (ascending) R.drawable.ic_arrow_upward else R.drawable.ic_arrow_downward),
            contentDescription = stringResource(if (ascending) R.string.list_sort_ascending else R.string.list_sort_descending),
        )
    }
}

/**
 * The filter panel of the web: "Select All", "Clear All", the tasks without a category and every
 * category, each with its number of tasks in the tab and the search. A change goes to [onFilter]
 * at once. The panel builds each change on its own last one, as the web does: a second tap that
 * comes before the first change is back from Firestore would otherwise undo it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterSheet(
    categories: List<Category>,
    filter: ListFilter,
    numbers: Map<String?, Int>,
    onFilter: (ListFilter) -> Unit,
    onDismiss: () -> Unit,
) {
    var shown by remember { mutableStateOf(filter) }
    val change = { next: ListFilter ->
        shown = next
        onFilter(next)
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        // The panel scrolls when its categories do not fit: in landscape, say, or with many of them.
        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .padding(bottom = 24.dp),
        ) {
            Row(modifier = Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.list_categories), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                TextButton(onClick = { change(SHOW_ALL) }, modifier = Modifier.testTag("filter_all")) {
                    Text(stringResource(R.string.list_select_all))
                }
                TextButton(onClick = { change(SHOW_NONE) }, modifier = Modifier.testTag("filter_clear")) {
                    Text(stringResource(R.string.list_clear_all))
                }
            }
            FilterRow(
                checked = shown.showUncategorized,
                color = MaterialTheme.colorScheme.surfaceVariant,
                name = stringResource(R.string.list_no_category),
                number = numbers[null] ?: 0,
                tag = "filter_none",
                onToggle = { change(shown.toggledUncategorized()) },
            )
            val chosen = shown.chosen(categories)
            categories.forEach { category ->
                FilterRow(
                    checked = category.id in chosen,
                    color = paletteColor(category.color),
                    name = category.name,
                    number = numbers[category.id] ?: 0,
                    tag = "filter_${category.id}",
                    onToggle = { change(shown.toggled(category.id, categories)) },
                )
            }
        }
    }
}

@Composable
private fun FilterRow(checked: Boolean, color: Color, name: String, number: Int, tag: String, onToggle: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(value = checked, role = Role.Checkbox, onValueChange = { onToggle() })
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Checkbox(checked = checked, onCheckedChange = null)
        Box(
            Modifier
                .size(16.dp)
                .background(color, CircleShape),
        )
        Text(name, modifier = Modifier.weight(1f))
        Text(number.toString(), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/**
 * A task as the web's list shows it: the icon of its status, the title, the due (red and "Overdue"
 * once passed, whatever the status, as on the web), the category, and the times of creation,
 * change and deletion. A done or deleted task is tinted as on the web. A tap opens the task; the
 * button of the row does the first action of its status, and the menu the others (2.2 №10).
 */
@Composable
private fun TaskRow(
    task: Task,
    category: Category?,
    language: Language,
    zone: String,
    now: Instant,
    menuOpen: Boolean,
    onMenu: (Boolean) -> Unit,
    onOpen: () -> Unit,
    onAction: (TaskAction) -> Unit,
) {
    val surface = MaterialTheme.colorScheme.surface
    val tint = when (task.status) {
        TaskStatus.ACTIVE -> surface
        TaskStatus.DONE -> DoneGreen.copy(alpha = 0.12f).compositeOver(surface)
        TaskStatus.DELETED -> MaterialTheme.colorScheme.error.copy(alpha = 0.12f).compositeOver(surface)
    }
    val actions = task.actions()
    OutlinedCard(
        onClick = onOpen,
        colors = CardDefaults.outlinedCardColors(containerColor = tint),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("task"),
    ) {
        Row(modifier = Modifier.padding(start = 16.dp, top = 4.dp, bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(Modifier.padding(top = 12.dp)) { StatusIcon(task.status) }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(task.title, style = MaterialTheme.typography.titleMedium)
                task.due?.let { DueLine(it, language, zone, now) }
                CategoryChip(task.categoryId, category)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Time(stringResource(R.string.list_created, listDateTime(task.createdAt, zone, language)))
                    if (task.changedAfterCreation()) Time(stringResource(R.string.list_updated, listDateTime(task.updatedAt, zone, language)))
                    task.deletedAt?.let { Time(stringResource(R.string.list_deleted, listDateTime(it, zone, language))) }
                }
            }
            Row {
                val first = actions.first()
                IconButton(onClick = { onAction(first) }, modifier = Modifier.testTag("row_${first.tag}")) {
                    Icon(
                        painterResource(first.icon),
                        contentDescription = stringResource(first.label),
                        tint = if (first == TaskAction.DONE) DoneGreen else MaterialTheme.colorScheme.primary,
                    )
                }
                Box {
                    IconButton(onClick = { onMenu(true) }, modifier = Modifier.testTag("row_menu")) {
                        Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.task_actions))
                    }
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { onMenu(false) }) {
                        actions.drop(1).forEach { action ->
                            DropdownMenuItem(
                                text = { Text(stringResource(action.label)) },
                                leadingIcon = { Icon(painterResource(action.icon), contentDescription = null) },
                                onClick = {
                                    onMenu(false)
                                    onAction(action)
                                },
                                modifier = Modifier.testTag("menu_${action.tag}"),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Note(text: String, color: Color, tag: String, modifier: Modifier = Modifier) {
    Text(text = text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = modifier.testTag(tag))
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    ToDoRoundTheme {
        HomeScreen(
            Session.SignedIn(
                email = "olena@example.com",
                data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false)),
            ),
            onSignOut = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenFailedPreview() {
    ToDoRoundTheme {
        HomeScreen(Session.SignedIn(email = "olena@example.com", data = null, failed = true), onSignOut = {})
    }
}
