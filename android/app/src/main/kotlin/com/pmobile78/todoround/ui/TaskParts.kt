package com.pmobile78.todoround.ui

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.ui.theme.DoneGreen
import java.time.Instant

/*
 * The parts the row of the list and the screen of a task show alike: the icon of the status, the
 * due with "Overdue", the category, the times, and the actions with their texts and icons.
 */

@Composable
internal fun StatusIcon(status: TaskStatus) {
    Icon(
        painter = painterResource(if (status == TaskStatus.DELETED) R.drawable.ic_delete_outline else R.drawable.ic_check_circle),
        contentDescription = null,
        tint = when (status) {
            TaskStatus.ACTIVE -> MaterialTheme.colorScheme.primary
            TaskStatus.DONE -> DoneGreen
            TaskStatus.DELETED -> MaterialTheme.colorScheme.error
        },
    )
}

/** The due in [zone], the zone of the phone, red and with "Overdue" once passed at [now]. */
@Composable
internal fun DueLine(due: Due, language: Language, zone: String, now: Instant) {
    val view = dueView(due, zone, now)
    // A mark that does not fit beside the due goes whole to the next line.
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        itemVerticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(R.string.list_due, listDateTime(view.local, language)),
            style = MaterialTheme.typography.bodyMedium,
            color = if (view.overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
        )
        if (view.overdue) OverdueMark()
    }
}

/** The category of a task, or the grey "No Tag" of the web when its category is gone. */
@Composable
internal fun CategoryChip(categoryId: String?, category: Category?) {
    when {
        category != null -> Chip(category.name, paletteColor(category.color), Color.White)
        categoryId != null -> Chip(
            stringResource(R.string.list_no_category),
            MaterialTheme.colorScheme.surfaceVariant,
            MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun Time(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

/** A colour of the palette, "#rrggbb". */
internal fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))

/** The text of an action: the web's, with "task" for its "bubble" (stage 2 spec, 2.2 №23). */
@get:StringRes
internal val TaskAction.label: Int
    get() = when (this) {
        TaskAction.DONE -> R.string.task_done
        TaskAction.FINISH_SERIES -> R.string.task_finish_series
        TaskAction.DELETE -> R.string.task_delete
        TaskAction.RESTORE -> R.string.task_restore
        TaskAction.DELETE_FOREVER -> R.string.task_delete_forever
    }

@get:DrawableRes
internal val TaskAction.icon: Int
    get() = when (this) {
        TaskAction.DONE -> R.drawable.ic_check_circle
        TaskAction.FINISH_SERIES -> R.drawable.ic_done_all
        TaskAction.DELETE -> R.drawable.ic_delete_outline
        TaskAction.RESTORE -> R.drawable.ic_restore
        TaskAction.DELETE_FOREVER -> R.drawable.ic_delete_forever
    }

/** The test tag of an action: "action_done", "action_finish_series" … */
internal val TaskAction.tag: String
    get() = "action_" + name.lowercase()
