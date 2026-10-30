package com.pmobile78.todoround.core.markdown

import com.pmobile78.todoround.core.markdown.Block.BulletList
import com.pmobile78.todoround.core.markdown.Block.CodeBlock
import com.pmobile78.todoround.core.markdown.Block.Heading
import com.pmobile78.todoround.core.markdown.Block.OrderedList
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.Quote
import com.pmobile78.todoround.core.markdown.Block.Rule
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Text
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * A description as the web's editor shows it (stage 2 spec, section 8). Each example below gives
 * what the web gives for it (TipTap 3.32 over marked 17.0.6): the draft of plan 2.2 checked them,
 * and random descriptions, on the web's editor.
 */
class MarkdownTest {
    private fun tasks(blocks: List<Block>): List<TaskItem> = blocks.flatMap { block ->
        when (block) {
            is TaskList -> block.items.flatMap { listOf(it) + tasks(it.blocks) }
            is BulletList -> block.items.flatMap(::tasks)
            is OrderedList -> block.items.flatMap(::tasks)
            is Quote -> tasks(block.blocks)
            else -> emptyList()
        }
    }

    private fun tasks(description: String) = tasks(parseMarkdown(description))

    private fun p(text: String) = Paragraph(listOf(Text(text)))

    @Test
    fun `a checklist is the task items of the web, each with the offset of its mark`() {
        val description = "- [ ] milk\n- [x] bread\n* [X] butter"
        assertEquals(
            listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("milk"))), TaskItem(true, 14, listOf(p("bread"))), TaskItem(true, 26, listOf(p("butter")))))),
            parseMarkdown(description),
        )
    }

    @Test
    fun `a tap changes the mark of its item and nothing else`() {
        val description = "Купити:\r\n- [ ] молоко\r\n  - [X] хліб\r\n- [x] сир"
        val items = tasks(description)
        assertEquals(listOf(false, true, true), items.map { it.checked })
        assertEquals("Купити:\r\n- [x] молоко\r\n  - [X] хліб\r\n- [x] сир", toggleTask(description, items[0]))
        assertEquals("Купити:\r\n- [ ] молоко\r\n  - [ ] хліб\r\n- [x] сир", toggleTask(description, items[1]))
        assertEquals("Купити:\r\n- [ ] молоко\r\n  - [X] хліб\r\n- [ ] сир", toggleTask(description, items[2]))
    }

    @Test
    fun `nested checklists, checklists in quotes, in numbered lists and in lists of bullets each have their checkbox`() {
        assertEquals(listOf(false, true, false), tasks("- [ ] a\n  - [x] b\n- [ ] c").map { it.checked })
        assertEquals(listOf(13), tasks("> quote\n> - [ ] in it").map { it.mark })
        assertEquals(listOf(13), tasks("1. one\n   - [ ] sub").map { it.mark })
        // A list of bullets and tasks is cut into a list and a checklist, as on the web.
        assertEquals(
            listOf(BulletList(listOf(listOf(p("a")))), TaskList(listOf(TaskItem(false, 7, listOf(p("b")))))),
            parseMarkdown("- a\n- [ ] b"),
        )
    }

    @Test
    fun `no checkbox where the web shows none`() {
        // in a code block, with escaped brackets, in a numbered list, without the space after the
        // brackets, with nothing after them, in an html block, and under a paragraph line indented as code
        listOf(
            "```\n- [ ] code\n```",
            "- \\[ \\] escaped",
            "1. [ ] numbered",
            "- [ ]text",
            "- [ ]",
            "<div>\n- [ ] in html\n</div>",
            "para\n    - [ ] lazy",
        ).forEach { assertEquals(emptyList<TaskItem>(), tasks(it), it) }
    }

    @Test
    fun `toggleTask refuses a mark that is no longer there`() {
        val item = tasks("- [ ] milk").single()
        assertNull(toggleTask("milk", item))
        assertNull(toggleTask("- [x] milk", item))
        assertEquals("- [x] milk", toggleTask("- [ ] milk", item))
    }

    @Test
    fun `the blocks and the marks of text are those the web shows`() {
        assertEquals(
            listOf(
                Heading(1, listOf(Text("Title"))),
                Paragraph(
                    listOf(
                        Text("bold", bold = true), Text(" "), Text("it", italic = true), Text(" "), Text("gone", strike = true),
                        Text(" "), Text("code", code = true), Text(" "), Text("site", link = "https://example.com"),
                        Text(" "), Text("www.example.com", link = "http://www.example.com"),
                    ),
                ),
                Quote(listOf(p("said"))),
                OrderedList(2, null, listOf(listOf(p("two")), listOf(p("three")))),
                CodeBlock("kotlin", "val x = 1"),
                Rule,
                Paragraph(listOf(Text("line"), Inline.Break, Text("next"))),
            ),
            parseMarkdown(
                "# Title\n**bold** *it* ~~gone~~ `code` [site](https://example.com) www.example.com\n\n> said\n\n" +
                    "2. two\n3. three\n\n```kotlin\nval x = 1\n```\n---\nline  \nnext",
            ),
        )
    }

    @Test
    fun `raw html and a table show as the text they are, line by line`() {
        assertEquals(listOf(Paragraph(listOf(Text("a <b>b</b> c")))), parseMarkdown("a <b>b</b> c"))
        assertEquals(listOf(p("<div>\nx\n</div>")), parseMarkdown("<div>\nx\n</div>"))
        // The web runs the lines of a table together when it is all the description, and leaves it out beside other blocks.
        assertEquals(listOf(p("| a | b |\n|---|---|\n| 1 | 2 |")), parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |"))
        assertEquals(listOf(p("x"), p("| a | b |\n|---|---|\n| 1 | 2 |")), parseMarkdown("x\n\n| a | b |\n|---|---|\n| 1 | 2 |"))
    }

    @Test
    fun `the web's own ways stay`() {
        // Letters and roman numerals number a list too, and go on with it after a blank line; two
        // letters of any case and a dot start one; a line after a task is no part of it.
        assertEquals(
            listOf(OrderedList(1, "a", listOf(listOf(p("first")), listOf(p("second")))), Rule, OrderedList(4, "I", listOf(listOf(p("fourth"))))),
            parseMarkdown("a. first\nb. second\n\n- - -\n\nIV) fourth"),
        )
        assertEquals(listOf(OrderedList(2, null, listOf(listOf(p("two")), listOf(p("then letters"))))), parseMarkdown("2. two\n\nab. then letters"))
        assertEquals(listOf(OrderedList(1, null, listOf(listOf(p("Thanks\nNext"))))), parseMarkdown("Ok. Thanks\nNext"))
        assertEquals(listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("a"))))), p("b")), parseMarkdown("- [ ] a\nb"))
        // Four blank lines are one empty paragraph.
        assertEquals(listOf(p("a"), Paragraph(emptyList()), p("b")), parseMarkdown("a\n\n\n\n\nb"))
        // Since the web's 0.2.7: a fence with spaces before it is a code block, and a quote that ends in a
        // list numbered by letters takes the lines after it into its last item.
        assertEquals(listOf(p("text"), CodeBlock(null, "code")), parseMarkdown("text\n\n  ```\ncode\n  ```"))
        assertEquals(listOf(Quote(listOf(OrderedList(1, "a", listOf(listOf(p("first\nnext"))))))), parseMarkdown("> a. first\nnext"))
        // An image shows its text.
        assertEquals(listOf(p("cat")), parseMarkdown("![cat](https://example.com/cat.png)"))
    }

    @Test
    fun `an indented line under a task is a second paragraph of it`() {
        assertEquals(
            listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("a"), p("nested text"))), TaskItem(false, 25, listOf(p("b")))))),
            parseMarkdown("- [ ] a\n  nested text\n- [ ] b"),
        )
    }

    @Test
    fun `a checklist indented as code ends a paragraph of one character, as on the web`() {
        // marked cuts a paragraph where a block starts after its first character, and TipTap's checklist starts there.
        assertEquals(listOf(p("a"), TaskList(listOf(TaskItem(false, 9, listOf(p("b")))))), parseMarkdown("a\n    - [ ] b"))
        assertEquals(listOf(p("ab\n    - [ ] b")), parseMarkdown("ab\n    - [ ] b"))
    }

    @Test
    fun `only http, https and mailto links open`() {
        assertTrue(isSafeLink("https://example.com"))
        assertTrue(isSafeLink("HTTP://example.com"))
        assertTrue(isSafeLink("mailto:a@example.com"))
        assertFalse(isSafeLink("javascript:alert(1)"))
        assertFalse(isSafeLink("ftp://example.com"))
        assertFalse(isSafeLink("example.com"))
    }
}
