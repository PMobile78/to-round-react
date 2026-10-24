package com.pmobile78.todoround.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.ListOptions
import com.pmobile78.todoround.core.model.ListTab
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.holds
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.tabTasks
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import java.time.Instant

/**
 * The screen of a signed-in user: the top bar with the menu "Logout" and the task list, the web's
 * "Active" tab with the saved filter and sort of the account (spec 7). It follows the data live.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
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
    ) { padding ->
        val data = session.data
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                session.failed -> Note(stringResource(R.string.list_failed), MaterialTheme.colorScheme.error, "failed", Modifier.padding(16.dp))
                data == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskList(data)
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

/** The tasks of [data] as the web's "Active" tab, under their number and the notes about the data. */
@Composable
private fun TaskList(data: UserData) {
    val settings = data.settings
    val zone = deviceTimeZone()
    val now = Instant.now()
    val options = ListOptions(ListTab.ACTIVE, settings.listFilter, settings.listSort, query = "")
    val tasks = remember(data) { tabTasks(data.tasks.items, data.categories.items, options, zone, now) }
    val all = remember(data) { data.tasks.items.count { ListTab.ACTIVE.holds(it, zone, now) } }
    val categories = remember(data) { data.categories.items.associateBy { it.id } }
    val invalid = data.tasks.invalid + data.categories.invalid
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = stringResource(R.string.list_count, tasks.size),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.testTag("count"),
                )
                val quiet = MaterialTheme.colorScheme.onSurfaceVariant
                if (tasks.size < all) Note(stringResource(R.string.list_shown, tasks.size, all), quiet, "shown")
                if (invalid > 0) Note(stringResource(R.string.list_invalid, invalid), MaterialTheme.colorScheme.error, "invalid")
                if (data.tasks.fromCache || data.categories.fromCache) Note(stringResource(R.string.list_offline), quiet, "offline")
            }
        }
        if (tasks.isEmpty()) {
            item { Note(stringResource(R.string.list_empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
        }
        items(tasks, key = { it.id }) { task ->
            TaskRow(task, task.categoryId?.let(categories::get), settings.language, zone, now)
        }
    }
}

/** A task as the web's list shows it: the title, the due (red and "Overdue" once passed), the category. */
@Composable
private fun TaskRow(task: Task, category: Category?, language: Language, zone: String, now: Instant) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("task")
            .semantics(mergeDescendants = true) {},
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(task.title, style = MaterialTheme.typography.titleMedium)
            task.due?.let { due ->
                val view = dueView(due, zone, now)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = stringResource(R.string.list_due, listDateTime(view.local, language)),
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (view.overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                    )
                    if (view.overdue) OverdueMark()
                }
            }
            when {
                category != null -> Chip(category.name, paletteColor(category.color), Color.White)
                // The category is gone: the web shows "No Tag" in grey.
                task.categoryId != null -> Chip(
                    stringResource(R.string.list_no_category),
                    MaterialTheme.colorScheme.surfaceVariant,
                    MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun OverdueMark() {
    val red = MaterialTheme.colorScheme.error
    Text(
        text = stringResource(R.string.list_overdue),
        color = red,
        fontWeight = FontWeight.Bold,
        style = MaterialTheme.typography.labelSmall,
        modifier = Modifier
            .background(red.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .border(1.dp, red.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

@Composable
private fun Chip(text: String, background: Color, content: Color) {
    Text(
        text = text,
        color = content,
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier
            .background(background, RoundedCornerShape(16.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
private fun Note(text: String, color: Color, tag: String, modifier: Modifier = Modifier) {
    Text(text = text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = modifier.testTag(tag))
}

/** A colour of the palette, "#rrggbb". */
private fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))

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
