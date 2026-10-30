package com.pmobile78.todoround.ui

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.markdown.Emphasis
import com.pmobile78.todoround.core.markdown.LineStart
import com.pmobile78.todoround.core.markdown.Selected
import com.pmobile78.todoround.core.markdown.emphasized
import com.pmobile78.todoround.core.markdown.isSafeLink
import com.pmobile78.todoround.core.markdown.linked
import com.pmobile78.todoround.core.markdown.listed

/**
 * The description: its Markdown as text under the buttons of the web's toolbar (2.2 №3). A button
 * changes the text around the selection; a description longer than 100 000 characters is an error,
 * and the form cannot be saved then (spec 7).
 */
@Composable
internal fun DescriptionField(edit: Edit, onChange: (Edit) -> Unit) {
    // The keyboard's own part of the field, which the form does not keep.
    var composition by remember { mutableStateOf<TextRange?>(null) }
    val value = TextFieldValue(edit.form.description, edit.selection, composition)
    val change = { next: TextFieldValue ->
        composition = next.composition
        onChange(edit.copy(form = edit.form.copy(description = next.text), selection = next.selection))
    }
    val selected = Selected(value.text, value.selection.start, value.selection.end)
    val apply = { next: Selected -> change(TextFieldValue(next.text, TextRange(next.start, next.end))) }
    var linking by rememberSaveable { mutableStateOf(false) }
    val tooLong = edit.form.description.length > Limits.DESCRIPTION_MAX_LENGTH
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            stringResource(R.string.edit_description),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        FlowRow {
            Tool(R.drawable.ic_format_bold, R.string.edit_bold, "md_bold") { apply(selected.emphasized(Emphasis.BOLD)) }
            Tool(R.drawable.ic_format_italic, R.string.edit_italic, "md_italic") { apply(selected.emphasized(Emphasis.ITALIC)) }
            Tool(R.drawable.ic_format_strikethrough, R.string.edit_strikethrough, "md_strike") { apply(selected.emphasized(Emphasis.STRIKE)) }
            Tool(R.drawable.ic_format_list_bulleted, R.string.edit_bullet_list, "md_bullets") { apply(selected.listed(LineStart.BULLET)) }
            Tool(R.drawable.ic_format_list_numbered, R.string.edit_numbered_list, "md_numbers") { apply(selected.listed(LineStart.NUMBER)) }
            Tool(R.drawable.ic_check_box, R.string.edit_task_list, "md_tasks") { apply(selected.listed(LineStart.TASK)) }
            Tool(R.drawable.ic_link, R.string.edit_link, "md_link") { linking = true }
        }
        OutlinedTextField(
            value = value,
            onValueChange = change,
            placeholder = { Text(stringResource(R.string.edit_description_placeholder)) },
            isError = tooLong,
            supportingText = if (tooLong) {
                { Text(stringResource(R.string.edit_description_too_long), modifier = Modifier.testTag("description_too_long")) }
            } else {
                null
            },
            // A long description scrolls inside the field, as in the web's editor.
            minLines = 6,
            maxLines = 12,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("edit_description"),
        )
    }
    if (linking) {
        LinkDialog(
            onLink = { url ->
                linking = false
                selected.linked(url)?.let(apply)
            },
            onDismiss = { linking = false },
        )
    }
}

@Composable
private fun Tool(@DrawableRes icon: Int, @StringRes label: Int, tag: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.testTag(tag)) {
        Icon(painterResource(icon), contentDescription = stringResource(label))
    }
}

/** The address of a link, as the web asks for it; only http, https and mailto are taken (spec 8). */
@Composable
private fun LinkDialog(onLink: (String) -> Unit, onDismiss: () -> Unit) {
    var url by rememberSaveable { mutableStateOf("https://") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.edit_link)) },
        text = {
            OutlinedTextField(
                value = url,
                onValueChange = { url = it },
                label = { Text(stringResource(R.string.edit_enter_url)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                modifier = Modifier.testTag("link_url"),
            )
        },
        confirmButton = {
            TextButton(onClick = { onLink(url) }, enabled = isSafeLink(url.trim()), modifier = Modifier.testTag("link_ok")) {
                Text(stringResource(R.string.ok))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}
