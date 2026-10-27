package com.pmobile78.todoround.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.markdown.Block
import com.pmobile78.todoround.core.markdown.Inline
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.parseMarkdown
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.ReminderUnit
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.actions
import com.pmobile78.todoround.core.model.changedAfterCreation
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.reminderParts
import com.pmobile78.todoround.core.model.reminderPassed
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.withContext
import java.time.Clock

/**
 * The screen of the task [taskId] (stage 2 spec, section 7): its status, title, due, category,
 * reminders, repeat, description with the formatting and the checkboxes of the web, its times, and
 * the actions of its status (2.2 №12). It follows the data live. An action closes it ([onBack]), as
 * it closes the web's dialog; a task that is no longer there, deleted forever on another device
 * say, closes it through [onGone]. A write the server or the core refused comes out of [writeFailures].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskScreen(
    taskId: String,
    session: Session.SignedIn,
    onBack: () -> Unit,
    onAction: (Task, TaskAction) -> Unit,
    onToggle: (Task, TaskItem) -> Unit,
    onGone: () -> Unit,
    writeFailures: Flow<Unit> = emptyFlow(),
    clock: Clock = Clock.systemUTC(),
) {
    BackHandler(onBack = onBack)
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    LaunchedEffect(writeFailures) {
        writeFailures.collect { snackbars.showSnackbar(notSaved) }
    }
    val data = session.data
    val task = data?.tasks?.items?.firstOrNull { it.id == taskId }
    // Data from the cache may not have the task yet (stage 3 opens it from a notification): only the
    // server's data tell that it is gone.
    if (data != null && task == null && !data.tasks.fromCache) {
        LaunchedEffect(Unit) { onGone() }
    }
    Scaffold(
        modifier = Modifier.testTag("task_screen"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.task_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("back")) {
                        Icon(painterResource(R.drawable.ic_arrow_back), contentDescription = stringResource(R.string.task_back))
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbars) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding),
        ) {
            when {
                session.failed -> Text(
                    stringResource(R.string.list_failed),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp).testTag("failed"),
                )
                task == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskDetails(
                    task = task,
                    data = data,
                    clock = clock,
                    onAction = { action ->
                        onAction(task, action)
                        onBack()
                    },
                    onToggle = { item -> onToggle(task, item) },
                )
            }
        }
    }
}

@Composable
private fun TaskDetails(task: Task, data: UserData, clock: Clock, onAction: (TaskAction) -> Unit, onToggle: (TaskItem) -> Unit) {
    val zone = deviceTimeZone()
    val now = currentMinute(clock)
    val language = data.settings.language
    val category = task.categoryId?.let { id -> data.categories.items.firstOrNull { it.id == id } }
    var confirmForever by rememberSaveable { mutableStateOf(false) }
    // The question goes with the status that has "Delete forever", as the list's does: a task restored
    // elsewhere meanwhile is not deleted for good, and the question does not come back with the status.
    val canDeleteForever = TaskAction.DELETE_FOREVER in task.actions()
    LaunchedEffect(canDeleteForever) { if (!canDeleteForever) confirmForever = false }
    // The description is read away from the main thread: the web's Markdown takes long on a few
    // pathological texts. A parse that fails shows the text as it is.
    val blocks by produceState<List<Block>?>(null, task.description) {
        value = withContext(Dispatchers.Default) {
            runCatching { parseMarkdown(task.description) }.getOrElse { listOf(Block.Paragraph(listOf(Inline.Text(task.description)))) }
        }
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            StatusIcon(task.status)
            Spacer(Modifier.width(8.dp))
            Text(stringResource(task.status.label), style = MaterialTheme.typography.labelLarge, modifier = Modifier.testTag("status"))
        }
        Text(task.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.testTag("title"))
        task.due?.let { due -> DueLine(due, language, zone, now) }
        CategoryChip(task.categoryId, category)
        val due = task.due
        if (due != null && task.reminders.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                task.reminders.forEach { minutes ->
                    val passed = reminderPassed(minutes, due, zone, now)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(painterResource(R.drawable.ic_notifications), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            reminderLabel(minutes),
                            style = MaterialTheme.typography.bodyMedium,
                            textDecoration = if (passed) TextDecoration.LineThrough else null,
                            color = if (passed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.testTag("reminder"),
                        )
                    }
                }
            }
        }
        task.repeat?.let { repeat ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(R.drawable.ic_repeat), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(repeatText(repeat), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.testTag("repeat"))
            }
        }
        blocks?.let { if (task.description.isNotEmpty()) MarkdownView(it, onToggle, Modifier.testTag("description")) }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.testTag("times")) {
            Time(stringResource(R.string.list_created, listDateTime(task.createdAt, zone, language)))
            if (task.changedAfterCreation()) Time(stringResource(R.string.list_updated, listDateTime(task.updatedAt, zone, language)))
            task.deletedAt?.let { Time(stringResource(R.string.list_deleted, listDateTime(it, zone, language))) }
        }
        val actions = task.actions()
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            actions.forEachIndexed { index, action ->
                val click = { if (action == TaskAction.DELETE_FOREVER) confirmForever = true else onAction(action) }
                val content: @Composable () -> Unit = {
                    Icon(painterResource(action.icon), contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(action.label))
                }
                val danger = action == TaskAction.DELETE || action == TaskAction.DELETE_FOREVER
                if (index == 0) {
                    Button(onClick = click, modifier = Modifier.testTag(action.tag)) { content() }
                } else {
                    OutlinedButton(
                        onClick = click,
                        colors = if (danger) ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error) else ButtonDefaults.outlinedButtonColors(),
                        modifier = Modifier.testTag(action.tag),
                    ) { content() }
                }
            }
        }
        // The line of the web's dialog under the buttons of a repeating task.
        if (TaskAction.FINISH_SERIES in actions) {
            Text(
                stringResource(R.string.task_repeat_actions_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.testTag("repeat_hint"),
            )
        }
    }
    if (confirmForever && canDeleteForever) {
        DeleteForeverDialog(onConfirm = {
            confirmForever = false
            onAction(TaskAction.DELETE_FOREVER)
        }, onDismiss = { confirmForever = false })
    }
}

/** The question before "Delete forever" (stage 2 spec, 2.2 №12): the web asks none, but the step cannot be undone. */
@Composable
internal fun DeleteForeverDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.task_delete_forever_confirm)) },
        text = { Text(stringResource(R.string.task_delete_forever_message)) },
        confirmButton = {
            TextButton(onClick = onConfirm, modifier = Modifier.testTag("delete_forever_confirm")) {
                Text(stringResource(R.string.task_delete_forever), color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}

private val TaskStatus.label: Int
    get() = when (this) {
        TaskStatus.ACTIVE -> R.string.task_status_active
        TaskStatus.DONE -> R.string.task_status_done
        TaskStatus.DELETED -> R.string.task_status_deleted
    }

// "1 hour before", "2 days before": the largest whole unit, as the web writes it.
@Composable
private fun reminderLabel(minutes: Int): String {
    val parts = reminderParts(minutes)
    val plural = when (parts.unit) {
        ReminderUnit.HOURS -> R.plurals.task_reminder_hours
        ReminderUnit.DAYS -> R.plurals.task_reminder_days
        ReminderUnit.WEEKS -> R.plurals.task_reminder_weeks
    }
    return pluralStringResource(plural, parts.count, parts.count)
}

// "Every 2 weeks: MON, FRI".
@Composable
private fun repeatText(repeat: Repeat): String {
    val plural = when (repeat.unit) {
        RepeatUnit.HOURS -> R.plurals.task_repeat_hours
        RepeatUnit.DAYS -> R.plurals.task_repeat_days
        RepeatUnit.WEEKS -> R.plurals.task_repeat_weeks
        RepeatUnit.MONTHS -> R.plurals.task_repeat_months
    }
    val every = pluralStringResource(plural, repeat.every, repeat.every)
    val weekdays = repeat.weekdays.orEmpty()
    if (weekdays.isEmpty()) return every
    val names = weekdays.map { stringResource(WEEKDAYS[it - 1]) }
    return stringResource(R.string.task_repeat_on, every, names.joinToString(", "))
}

private val WEEKDAYS = listOf(
    R.string.task_monday, R.string.task_tuesday, R.string.task_wednesday, R.string.task_thursday,
    R.string.task_friday, R.string.task_saturday, R.string.task_sunday,
)
