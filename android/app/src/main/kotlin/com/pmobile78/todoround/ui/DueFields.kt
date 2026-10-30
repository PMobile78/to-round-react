package com.pmobile78.todoround.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimeInput
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDialog
import androidx.compose.material3.TimePickerDialogDefaults
import androidx.compose.material3.TimePickerDisplayMode
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.NEW_REPEAT
import com.pmobile78.todoround.core.model.REMINDER_PRESETS
import com.pmobile78.todoround.core.model.ReminderUnit
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.formDateTime
import com.pmobile78.todoround.core.model.pickedDate
import com.pmobile78.todoround.core.model.pickedDue
import com.pmobile78.todoround.core.model.pickerMillis
import com.pmobile78.todoround.core.model.reminderMinutes
import com.pmobile78.todoround.core.model.reminderPassed
import com.pmobile78.todoround.core.model.repeatEvery
import com.pmobile78.todoround.core.model.toggledWeekday
import com.pmobile78.todoround.core.model.withReminder
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/*
 * The fields of the form that hang on the due (stage 2 spec, section 7): the due itself, its
 * reminders and the repeat, as the web's dialog has them (BubbleDialogForm.jsx, ReminderEditor.jsx,
 * RepeatEditor.jsx). Without a due neither reminders nor a repeat can be set.
 */

/**
 * The due: the date and then the time of the pickers on this phone, in 24 hours, written as the
 * web's date picker writes them; "Clear" takes the reminders and the repeat with it ([onClear]), and
 * a due that has passed at [now] is overdue.
 */
@Composable
internal fun DueField(due: String?, language: Language, zone: String, now: Instant, onPick: (String) -> Unit, onClear: () -> Unit) {
    var picking by rememberSaveable { mutableStateOf(false) }
    val overdue = due != null && dueView(Due(due, zone), zone, now).overdue
    val label = stringResource(R.string.edit_due)
    val shown = due?.let { formDateTime(it, language) }.orEmpty()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                OutlinedTextField(
                    value = shown,
                    onValueChange = {},
                    readOnly = true,
                    singleLine = true,
                    isError = overdue,
                    label = { Text(label) },
                    trailingIcon = { Icon(painterResource(R.drawable.ic_event), contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                )
                // A touch anywhere on the field opens the pickers. The field under it is covered, and TalkBack
                // does not reach a covered node: this one says the label and the due instead.
                Box(
                    Modifier
                        .matchParentSize()
                        .clickable { picking = true }
                        .semantics { contentDescription = if (due == null) label else "$label: $shown" }
                        .testTag("edit_due"),
                )
            }
            if (due != null) {
                IconButton(onClick = onClear, modifier = Modifier.testTag("due_clear")) {
                    Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.edit_due_clear))
                }
            }
        }
        if (overdue) OverdueMark()
    }
    if (picking) {
        DuePickers(
            due = due,
            zone = zone,
            now = now,
            onPick = {
                picking = false
                onPick(it)
            },
            onDismiss = { picking = false },
        )
    }
}

// The date picker, then the time picker; both open on the due, or on now. The day of a date picker
// of Material 3 is read in UTC (spec, section 15).
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DuePickers(due: String?, zone: String, now: Instant, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val start = parseLocal(due) ?: LocalDateTime.ofInstant(now, ZoneId.of(zone))
    var day by rememberSaveable { mutableStateOf<Long?>(null) }
    val picked = day
    if (picked == null) {
        val state = rememberDatePickerState(initialSelectedDateMillis = pickerMillis(start.toLocalDate()))
        DatePickerDialog(
            onDismissRequest = onDismiss,
            confirmButton = {
                TextButton(onClick = { day = state.selectedDateMillis }, enabled = state.selectedDateMillis != null, modifier = Modifier.testTag("date_ok")) {
                    Text(stringResource(R.string.ok))
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.cancel))
                }
            },
        ) {
            DatePicker(state)
        }
    } else {
        val state = rememberTimePickerState(initialHour = start.hour, initialMinute = start.minute, is24Hour = true)
        // The mode is no value a saved state can keep: the screen keeps whether the keyboard is chosen.
        var keyboard by rememberSaveable { mutableStateOf(false) }
        val mode = if (keyboard) TimePickerDisplayMode.Input else TimePickerDisplayMode.Picker
        TimePickerDialog(
            onDismissRequest = onDismiss,
            confirmButton = {
                TextButton(onClick = { onPick(pickedDue(pickedDate(picked), state.hour, state.minute)) }, modifier = Modifier.testTag("time_ok")) {
                    Text(stringResource(R.string.ok))
                }
            },
            title = { TimePickerDialogDefaults.Title(displayMode = mode) },
            modeToggleButton = {
                TimePickerDialogDefaults.DisplayModeToggle(onDisplayModeChange = { keyboard = !keyboard }, displayMode = mode)
            },
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.cancel))
                }
            },
        ) {
            if (keyboard) TimeInput(state) else TimePicker(state)
        }
    }
}

/**
 * The reminders of the form, each with its time before the due — struck through once passed — and
 * a button that removes it. "Remind me" adds 1 hour, 1 day or a number of hours, days or weeks of
 * one's own; without a due, or with 10 reminders, it is off, and a line under it says why (the web
 * says it in a tooltip, which a phone does not have).
 */
@Composable
internal fun ReminderField(reminders: List<Int>, due: String?, zone: String, now: Instant, onChange: (List<Int>) -> Unit) {
    var adding by rememberSaveable { mutableStateOf(false) }
    val full = reminders.size >= Limits.MAX_REMINDERS
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        reminders.forEach { minutes ->
            val passed = due != null && reminderPassed(minutes, Due(due, zone), zone, now)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(R.drawable.ic_notifications), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    reminderLabel(minutes),
                    style = MaterialTheme.typography.bodyMedium,
                    textDecoration = if (passed) TextDecoration.LineThrough else null,
                    color = if (passed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("form_reminder"),
                )
                IconButton(onClick = { onChange(reminders.filter { it != minutes }) }, modifier = Modifier.testTag("reminder_delete_$minutes")) {
                    Icon(painterResource(R.drawable.ic_delete_outline), contentDescription = stringResource(R.string.edit_reminder_delete))
                }
            }
        }
        OutlinedButton(onClick = { adding = true }, enabled = due != null && !full, modifier = Modifier.testTag("remind_me")) {
            Text(stringResource(R.string.edit_remind_me))
        }
        if (due == null || full) {
            Text(
                stringResource(if (due == null) R.string.edit_remind_me_disabled else R.string.edit_reminders_max),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.testTag("remind_me_hint"),
            )
        }
    }
    if (adding) {
        ReminderDialog(
            reminders = reminders,
            onAdd = {
                adding = false
                onChange(withReminder(reminders, it))
            },
            onDismiss = { adding = false },
        )
    }
}

// "Add notification" of the web: 1 hour, 1 day — unless the task has it — or "Custom…", a number of
// hours, days or weeks from 1 hour to 52 weeks.
@Composable
private fun ReminderDialog(reminders: List<Int>, onAdd: (Int) -> Unit, onDismiss: () -> Unit) {
    var preset by rememberSaveable { mutableStateOf<Int?>(null) }
    var custom by rememberSaveable { mutableStateOf(false) }
    var count by rememberSaveable { mutableStateOf("") }
    var unit by rememberSaveable { mutableStateOf(ReminderUnit.HOURS) }
    val chosen = if (custom) reminderMinutes(count, unit) else preset
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.edit_add_notification)) },
        text = {
            Column(Modifier.selectableGroup()) {
                REMINDER_PRESETS.forEach { minutes ->
                    Choice(reminderLabel(minutes), selected = !custom && preset == minutes, enabled = minutes !in reminders, tag = "preset_$minutes") {
                        custom = false
                        preset = minutes
                    }
                }
                Choice(stringResource(R.string.edit_custom), selected = custom, enabled = true, tag = "preset_custom") { custom = true }
                if (custom) {
                    OutlinedTextField(
                        value = count,
                        // Digits only: the number keyboard of a phone has other keys too.
                        onValueChange = { text -> count = text.filter(Char::isDigit).take(6) },
                        label = { Text(stringResource(R.string.edit_value)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .padding(top = 8.dp)
                            .width(120.dp)
                            .testTag("custom_count"),
                    )
                    FlowRow(Modifier.selectableGroup()) {
                        ReminderUnit.entries.forEach { each ->
                            Choice(stringResource(each.label), selected = unit == each, enabled = true, tag = "reminder_unit_${each.name.lowercase()}") { unit = each }
                        }
                    }
                    Text(stringResource(R.string.edit_reminder_range), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { chosen?.let(onAdd) }, enabled = chosen != null && chosen !in reminders, modifier = Modifier.testTag("reminder_save")) {
                Text(stringResource(R.string.edit_save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}

@Composable
private fun Choice(text: String, selected: Boolean, enabled: Boolean, tag: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .selectable(selected = selected, enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .padding(vertical = 4.dp, horizontal = 4.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = null, enabled = enabled)
        Spacer(Modifier.width(8.dp))
        Text(text, color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private val ReminderUnit.label: Int
    get() = when (this) {
        ReminderUnit.HOURS -> R.string.edit_hours
        ReminderUnit.DAYS -> R.string.edit_days
        ReminderUnit.WEEKS -> R.string.edit_weeks
    }

/**
 * The repeat: a switch that starts it at every 1 day, "Every" from 1 to 999 — another number is not
 * taken, and the field shows the number of the repeat again when it loses focus —, the unit, and the
 * days of a weekly repeat. Without a due ([enabled] false) it is off and locked.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RepeatField(repeat: Repeat?, enabled: Boolean, onChange: (Repeat?) -> Unit) {
    val on = repeat != null && enabled
    var every by remember(repeat?.every) { mutableStateOf((repeat?.every ?: 1).toString()) }
    var choosing by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier
                .toggleable(value = on, enabled = enabled, role = Role.Switch) { onChange(if (it) NEW_REPEAT else null) }
                .testTag("repeat_switch"),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Switch(checked = on, onCheckedChange = null, enabled = enabled)
            Spacer(Modifier.width(12.dp))
            Text(stringResource(R.string.edit_repeat_every))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = every,
                onValueChange = { text ->
                    every = text.filter(Char::isDigit).take(4)
                    val number = repeatEvery(every)
                    if (repeat != null && number != null) onChange(repeat.copy(every = number))
                },
                enabled = on,
                singleLine = true,
                label = { Text(stringResource(R.string.edit_every)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier
                    .width(120.dp)
                    .onFocusChanged { if (!it.isFocused) every = (repeat?.every ?: 1).toString() }
                    .testTag("repeat_every"),
            )
            ExposedDropdownMenuBox(expanded = choosing, onExpandedChange = { choosing = it && on }, modifier = Modifier.weight(1f)) {
                OutlinedTextField(
                    value = stringResource((repeat?.unit ?: RepeatUnit.DAYS).label),
                    onValueChange = {},
                    readOnly = true,
                    enabled = on,
                    singleLine = true,
                    label = { Text(stringResource(R.string.edit_unit)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = choosing) },
                    modifier = Modifier
                        .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable, enabled = on)
                        .testTag("repeat_unit"),
                )
                ExposedDropdownMenu(expanded = choosing, onDismissRequest = { choosing = false }) {
                    RepeatUnit.entries.forEach { unit ->
                        DropdownMenuItem(
                            text = { Text(stringResource(unit.label)) },
                            onClick = {
                                choosing = false
                                if (repeat != null) onChange(repeat.copy(unit = unit))
                            },
                            modifier = Modifier.testTag("repeat_unit_${unit.wire}"),
                        )
                    }
                }
            }
        }
        if (on && repeat.unit == RepeatUnit.WEEKS) {
            Text(
                stringResource(R.string.edit_select_week_days),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                WEEKDAYS.forEachIndexed { index, name ->
                    val day = index + 1
                    FilterChip(
                        selected = day in repeat.weekdays.orEmpty(),
                        onClick = { onChange(repeat.toggledWeekday(day)) },
                        label = { Text(stringResource(name)) },
                        modifier = Modifier.testTag("weekday_$day"),
                    )
                }
            }
        }
    }
}

private val RepeatUnit.label: Int
    get() = when (this) {
        RepeatUnit.HOURS -> R.string.edit_hours
        RepeatUnit.DAYS -> R.string.edit_days
        RepeatUnit.WEEKS -> R.string.edit_weeks
        RepeatUnit.MONTHS -> R.string.edit_months
    }
