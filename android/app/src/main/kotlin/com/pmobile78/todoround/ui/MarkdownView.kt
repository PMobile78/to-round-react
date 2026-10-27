package com.pmobile78.todoround.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.core.markdown.Block
import com.pmobile78.todoround.core.markdown.Inline
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.isSafeLink

/**
 * A description as the web shows it (stage 2 spec, 2.2 №1): the blocks of the core with the styles
 * of Material 3. A checkbox changes its item through [onToggle] (2.2 №2); a link opens in the
 * browser when its address is http, https or mailto, and is plain text otherwise.
 */
@Composable
fun MarkdownView(blocks: List<Block>, onToggle: (TaskItem) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        blocks.forEach { MarkdownBlock(it, onToggle) }
    }
}

@Composable
private fun MarkdownBlock(block: Block, onToggle: (TaskItem) -> Unit) {
    when (block) {
        is Block.Paragraph -> if (block.content.isEmpty()) {
            // An empty paragraph of the web: a line of space.
            Spacer(Modifier.height(16.dp))
        } else {
            Text(annotated(block.content), style = MaterialTheme.typography.bodyLarge)
        }
        is Block.Heading -> Text(annotated(block.content), style = headingStyle(block.level))
        is Block.Quote -> Row(Modifier.height(IntrinsicSize.Min)) {
            Box(
                Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .background(MaterialTheme.colorScheme.outlineVariant),
            )
            MarkdownView(block.blocks, onToggle, Modifier.padding(start = 12.dp))
        }
        is Block.BulletList -> ListItems(block.items.map { "•" to it }, onToggle)
        is Block.OrderedList -> ListItems(block.items.mapIndexed { i, item -> "${listMarker(block.type, block.start + i)}." to item }, onToggle)
        is Block.TaskList -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            block.items.forEach { item ->
                Row(verticalAlignment = Alignment.Top) {
                    // A mark the description no longer has at its place shows, and does not change.
                    Checkbox(
                        checked = item.checked,
                        onCheckedChange = if (item.mark >= 0) ({ onToggle(item) }) else null,
                        enabled = item.mark >= 0,
                        modifier = Modifier.testTag("checkbox"),
                    )
                    MarkdownView(item.blocks, onToggle, Modifier.padding(top = 12.dp))
                }
            }
        }
        is Block.CodeBlock -> Text(
            text = block.text,
            style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
            softWrap = false,
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
                .horizontalScroll(rememberScrollState())
                .padding(8.dp),
        )
        Block.Rule -> HorizontalDivider(Modifier.padding(vertical = 8.dp))
    }
}

// The items of a list, each after its [marker], their blocks lined up.
@Composable
private fun ListItems(items: List<Pair<String, List<Block>>>, onToggle: (TaskItem) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.forEach { (marker, blocks) ->
            Row {
                Text(marker, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.width(32.dp))
                MarkdownView(blocks, onToggle)
            }
        }
    }
}

@Composable
private fun headingStyle(level: Int): TextStyle = when (level) {
    1 -> MaterialTheme.typography.headlineSmall
    2 -> MaterialTheme.typography.titleLarge
    3 -> MaterialTheme.typography.titleMedium
    4 -> MaterialTheme.typography.titleSmall
    else -> MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold)
}

// The marker of an ordered list as the browser writes it for the type of the web's <ol>.
private fun listMarker(type: String?, number: Int): String = when (type) {
    "a" -> alpha(number)
    "A" -> alpha(number).uppercase()
    "i" -> roman(number)
    "I" -> roman(number).uppercase()
    else -> number.toString()
}

private fun alpha(number: Int): String {
    var n = number
    val letters = StringBuilder()
    while (n > 0) {
        n--
        letters.insert(0, 'a' + n % 26)
        n /= 26
    }
    return letters.toString()
}

private fun roman(number: Int): String {
    var n = number
    val result = StringBuilder()
    for ((value, numeral) in ROMAN) {
        while (n >= value) {
            result.append(numeral)
            n -= value
        }
    }
    return result.toString()
}

private val ROMAN = listOf(
    1000 to "m", 900 to "cm", 500 to "d", 400 to "cd", 100 to "c", 90 to "xc",
    50 to "l", 40 to "xl", 10 to "x", 9 to "ix", 5 to "v", 4 to "iv", 1 to "i",
)

@Composable
private fun annotated(content: List<Inline>): AnnotatedString {
    val linkStyles = TextLinkStyles(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
    val codeBackground = MaterialTheme.colorScheme.surfaceVariant
    return buildAnnotatedString {
        content.forEach { inline ->
            when (inline) {
                Inline.Break -> append('\n')
                is Inline.Text -> {
                    val style = SpanStyle(
                        fontWeight = if (inline.bold) FontWeight.Bold else null,
                        fontStyle = if (inline.italic) FontStyle.Italic else null,
                        textDecoration = if (inline.strike) TextDecoration.LineThrough else null,
                        fontFamily = if (inline.code) FontFamily.Monospace else null,
                        background = if (inline.code) codeBackground else Color.Unspecified,
                    )
                    val link = inline.link
                    if (link != null && isSafeLink(link)) {
                        withLink(LinkAnnotation.Url(link, linkStyles)) { withStyle(style) { append(inline.text) } }
                    } else {
                        withStyle(style) { append(inline.text) }
                    }
                }
            }
        }
    }
}
