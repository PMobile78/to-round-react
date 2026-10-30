package com.pmobile78.todoround.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.contract.fromWire
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.NEW_TASK_FORM
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskForm
import com.pmobile78.todoround.core.model.canSave
import com.pmobile78.todoround.core.model.inOrder
import com.pmobile78.todoround.core.model.taskFromRecord
import com.pmobile78.todoround.core.model.toForm
import com.pmobile78.todoround.core.model.toRecord
import com.pmobile78.todoround.core.model.withoutDue
import kotlinx.coroutines.launch
import java.time.Clock
import kotlin.math.roundToInt

/**
 * The form of [task], null for a new task (stage 2 spec, section 7): as it opened ([opened]) and as
 * the user has it now ([form]), with the selection of its description.
 */
@Immutable
data class Edit(
    val task: Task?,
    val opened: TaskForm,
    val form: TaskForm,
    val selection: TextRange = TextRange(form.description.length),
) {
    /** Whether the user changed the form since it opened: leaving it then asks first (2.2 №14). */
    val changed: Boolean get() = form != opened

    companion object {
        /** The form of [task], or of a new task, as it opens on a phone in [zone]. */
        fun of(task: Task?, zone: String): Edit {
            val form = task?.toForm(zone) ?: NEW_TASK_FORM
            return Edit(task, form, form)
        }
    }
}

/**
 * The form as the saved state of the screen keeps it, in plain values (2.2 №14): the task it opened
 * on as its record, the form as it opened and as it is, and the selection. A description that is the
 * one before it is kept once.
 */
internal val EditSaver: Saver<Edit?, Any> = Saver(
    save = { edit ->
        edit?.let {
            arrayListOf(
                it.task?.let { task -> HashMap(task.toRecord().mapValues { (_, value) -> if (value is Map<*, *>) HashMap(value) else value }) },
                formValues(it.opened, keepDescription = it.opened.description != it.task?.description),
                formValues(it.form, keepDescription = it.form.description != it.opened.description),
                it.selection.start,
                it.selection.end,
            )
        }
    },
    restore = { saved ->
        val values = saved as List<*>
        @Suppress("UNCHECKED_CAST")
        val task = (values[0] as Map<String, Any?>?)?.let { taskFromRecord(it, acceptUnknownZone = true) }
        val opened = formOf(values[1] as List<*>, task?.description.orEmpty())
        Edit(task, opened, formOf(values[2] as List<*>, opened.description), TextRange(values[3] as Int, values[4] as Int))
    },
)

private fun formValues(form: TaskForm, keepDescription: Boolean): ArrayList<Any?> = arrayListOf(
    form.title,
    form.description.takeIf { keepDescription },
    form.categoryId,
    form.due,
    ArrayList(form.reminders),
    form.repeat?.every,
    form.repeat?.unit?.wire,
    form.repeat?.weekdays?.let { ArrayList(it) },
    form.repeat?.monthDay,
    form.radius,
)

@Suppress("UNCHECKED_CAST")
private fun formOf(values: List<*>, description: String) = TaskForm(
    title = values[0] as String,
    description = values[1] as String? ?: description,
    categoryId = values[2] as String?,
    due = values[3] as String?,
    reminders = values[4] as List<Int>,
    repeat = (values[5] as Int?)?.let { every ->
        Repeat(every, fromWire<RepeatUnit>(values[6])!!, values[7] as List<Int>?, values[8] as Int?)
    },
    radius = values[9] as Int,
)

/**
 * The screen «Правка» (stage 2 spec, section 7): every field of the web's dialog of a task — title,
 * description with the web's buttons, category, due, reminders, repeat and the size of its bubble on
 * the web. [taskId] null is a new task. "Save" hands the form to [onSave] (decisions 15 and 16 are
 * the caller's), which tells whether its write is sent: a write the core refused leaves the form as
 * the user has it, with a message (2.2 №16). Leaving a changed form asks first, and [onClose] closes
 * it (2.2 №14); the form keeps its state over a turn of the phone and an unloading of the app. A
 * task that is no longer there, deleted forever on another device say, closes it through [onGone].
 * [clock] tells the time.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditScreen(
    taskId: String?,
    session: Session.SignedIn,
    onSave: (Edit) -> Boolean,
    onClose: () -> Unit,
    onGone: () -> Unit = {},
    clock: Clock = Clock.systemUTC(),
) {
    val zone = deviceTimeZone()
    val data = session.data
    val task = taskId?.let { id -> data?.tasks?.items?.firstOrNull { it.id == id } }
    var edit by rememberSaveable(stateSaver = EditSaver) { mutableStateOf(if (taskId == null) Edit.of(null, zone) else task?.let { Edit.of(it, zone) }) }
    // The form of a task opens on the task once its data are there: after an unloading of the app they come later.
    LaunchedEffect(task != null) {
        if (edit == null && task != null) edit = Edit.of(task, zone)
    }
    // Only the server's data tell that the task is gone.
    if (taskId != null && data != null && task == null && !data.tasks.fromCache) {
        LaunchedEffect(Unit) { onGone() }
    }
    var leaving by rememberSaveable { mutableStateOf(false) }
    val leave = { if (edit?.changed == true) leaving = true else onClose() }
    BackHandler(onBack = leave)
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    val scope = rememberCoroutineScope()
    Scaffold(
        modifier = Modifier.testTag("edit_screen"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(if (taskId == null) R.string.edit_new_title else R.string.edit_title)) },
                navigationIcon = {
                    IconButton(onClick = leave, modifier = Modifier.testTag("edit_close")) {
                        Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.close))
                    }
                },
                actions = {
                    val current = edit
                    TextButton(
                        onClick = { if (current != null && !onSave(current)) scope.launch { snackbars.showSnackbar(notSaved) } },
                        enabled = current?.form?.canSave() == true,
                        modifier = Modifier.testTag("edit_save"),
                    ) {
                        Text(stringResource(if (taskId == null) R.string.edit_create else R.string.edit_save))
                    }
                },
            )
        },
        // Above the keyboard, which may still be open when "Save" is pressed.
        snackbarHost = { SnackbarHost(snackbars, Modifier.imePadding()) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding(),
        ) {
            val current = edit
            when {
                session.failed -> Text(
                    stringResource(R.string.list_failed),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp).testTag("failed"),
                )
                current == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> EditForm(current, data, clock, onChange = { edit = it })
            }
        }
    }
    if (leaving) {
        AlertDialog(
            onDismissRequest = { leaving = false },
            title = { Text(stringResource(R.string.edit_discard_confirm)) },
            text = { Text(stringResource(R.string.edit_discard_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        leaving = false
                        onClose()
                    },
                    modifier = Modifier.testTag("discard_confirm"),
                ) {
                    Text(stringResource(R.string.edit_discard), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { leaving = false }, modifier = Modifier.testTag("discard_keep")) {
                    Text(stringResource(R.string.edit_keep_editing))
                }
            },
        )
    }
}

// The fields in the order of the web's dialog. Until the data are read the categories are unknown.
@Composable
private fun EditForm(edit: Edit, data: UserData?, clock: Clock, onChange: (Edit) -> Unit) {
    val form = edit.form
    val set = { next: TaskForm -> onChange(edit.copy(form = next)) }
    val zone = deviceTimeZone()
    val now = currentMinute(clock)
    val language = data?.settings?.language ?: appLanguage()
    val categories = remember(data) { inOrder(data?.categories?.items.orEmpty()) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OutlinedTextField(
            value = form.title,
            // At most 1000 characters, as the web's field takes them.
            onValueChange = { set(form.copy(title = it.take(Limits.TITLE_MAX_LENGTH))) },
            label = { Text(stringResource(R.string.edit_task_title)) },
            minLines = 2,
            maxLines = 4,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("edit_title"),
        )
        DescriptionField(edit, onChange)
        CategoryField(form.categoryId, categories, onPick = { set(form.copy(categoryId = it)) })
        DueField(form.due, language, zone, now, onPick = { set(form.copy(due = it)) }, onClear = { set(form.withoutDue()) })
        ReminderField(form.reminders, form.due, zone, now, onChange = { set(form.copy(reminders = it)) })
        RepeatField(form.repeat, enabled = form.due != null, onChange = { set(form.copy(repeat = it)) })
        SizeField(form.radius, onChange = { set(form.copy(radius = it)) })
    }
}

/**
 * The category: "No category" or one of [categories] with its colour. A category deleted on another
 * device stays the task's until another is picked, and shows as the list shows it ("No Tag").
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryField(categoryId: String?, categories: List<Category>, onPick: (String?) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val category = categoryId?.let { id -> categories.firstOrNull { it.id == id } }
    val name = when {
        categoryId == null -> stringResource(R.string.edit_no_category)
        category == null -> stringResource(R.string.list_no_category)
        else -> category.name
    }
    ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }) {
        OutlinedTextField(
            value = name,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            label = { Text(stringResource(R.string.edit_category)) },
            leadingIcon = category?.let { { Dot(paletteColor(it.color)) } },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = open) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable)
                .testTag("edit_category"),
        )
        ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.edit_no_category), fontStyle = FontStyle.Italic) },
                onClick = {
                    open = false
                    onPick(null)
                },
                modifier = Modifier.testTag("category_none"),
            )
            categories.forEach { each ->
                DropdownMenuItem(
                    text = { Text(each.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    leadingIcon = { Dot(paletteColor(each.color)) },
                    onClick = {
                        open = false
                        onPick(each.id)
                    },
                    modifier = Modifier.testTag("category_${each.id}"),
                )
            }
        }
    }
}

/** The size of the task's bubble on the web, from 30 to 80 in steps of 5: the phone keeps it for the web (spec 7). */
@Composable
private fun SizeField(radius: Int, onChange: (Int) -> Unit) {
    Column {
        Text(
            stringResource(R.string.edit_size, radius),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(
            value = radius.toFloat(),
            onValueChange = { onChange(it.roundToInt()) },
            valueRange = Limits.RADIUS_MIN.toFloat()..Limits.RADIUS_MAX.toFloat(),
            steps = (Limits.RADIUS_MAX - Limits.RADIUS_MIN) / 5 - 1,
            modifier = Modifier.testTag("edit_size"),
        )
    }
}

@Composable
private fun Dot(color: Color) {
    Box(
        Modifier
            .size(16.dp)
            .background(color, CircleShape),
    )
}
