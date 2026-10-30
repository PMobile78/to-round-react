package com.pmobile78.todoround.core.markdown

import com.pmobile78.todoround.core.markdown.Block.OrderedList
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Text
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** The buttons over the description field: the Markdown they put in, and how the web then shows it. */
class ToolbarTest {
    private fun p(text: String) = Paragraph(listOf(Text(text)))

    @Test
    fun `bold, italic and strikethrough go around the selection, which stays on its text`() {
        val hello = Selected("say hello world", 4, 9)
        assertEquals(Selected("say **hello** world", 6, 11), hello.emphasized(Emphasis.BOLD))
        assertEquals(Selected("say *hello* world", 5, 10), hello.emphasized(Emphasis.ITALIC))
        assertEquals(Selected("say ~~hello~~ world", 6, 11), hello.emphasized(Emphasis.STRIKE))
        // A selection made backwards is the same selection.
        assertEquals(Selected("say **hello** world", 6, 11), Selected("say hello world", 9, 4).emphasized(Emphasis.BOLD))
        assertEquals(
            listOf(Paragraph(listOf(Text("say "), Text("hello", bold = true), Text(" world")))),
            parseMarkdown(hello.emphasized(Emphasis.BOLD).text),
        )
    }

    @Test
    fun `the spaces at the ends of the selection stay outside the marks`() {
        assertEquals(Selected("say **hello** world", 6, 11), Selected("say hello world", 3, 10).emphasized(Emphasis.BOLD))
    }

    @Test
    fun `without a selection an empty pair goes in with the cursor between`() {
        assertEquals(Selected("say ****world", 6, 6), Selected("say world", 4, 4).emphasized(Emphasis.BOLD))
        assertEquals(Selected("say  ~~~~world", 7, 7), Selected("say  world", 4, 5).emphasized(Emphasis.STRIKE))
    }

    @Test
    fun `bold and then italic make both`() {
        val both = Selected("hello", 0, 5).emphasized(Emphasis.BOLD).emphasized(Emphasis.ITALIC)
        assertEquals(Selected("***hello***", 3, 8), both)
        assertEquals(listOf(Paragraph(listOf(Text("hello", bold = true, italic = true)))), parseMarkdown(both.text))
    }

    @Test
    fun `a list start goes at the start of every line of the selection`() {
        val shopping = Selected("Buy:\nmilk\nbread", 5, 15)
        assertEquals(Selected("Buy:\n- [ ] milk\n- [ ] bread", 11, 27), shopping.listed(LineStart.TASK))
        assertEquals(Selected("Buy:\n- milk\n- bread", 7, 19), shopping.listed(LineStart.BULLET))
        assertEquals(
            listOf(p("Buy:"), TaskList(listOf(TaskItem(false, 8, listOf(p("milk"))), TaskItem(false, 19, listOf(p("bread")))))),
            parseMarkdown(shopping.listed(LineStart.TASK).text),
        )
    }

    @Test
    fun `numbers count the lines, and blank lines stay as they are`() {
        val numbered = Selected("milk\n\nbread\neggs", 0, 16).listed(LineStart.NUMBER)
        assertEquals(Selected("1. milk\n\n2. bread\n3. eggs", 3, 25), numbered)
        assertEquals(listOf(OrderedList(1, null, listOf(listOf(p("milk")), listOf(p("bread")), listOf(p("eggs"))))), parseMarkdown(numbered.text))
    }

    @Test
    fun `at a cursor the start goes at its line, an empty one too, and the cursor moves with the text`() {
        assertEquals(Selected("Buy:\n- milk", 9, 9), Selected("Buy:\nmilk", 7, 7).listed(LineStart.BULLET))
        assertEquals(Selected("Buy:\n- [ ] ", 11, 11), Selected("Buy:\n", 5, 5).listed(LineStart.TASK))
        assertEquals(Selected("1. ", 3, 3), Selected("", 0, 0).listed(LineStart.NUMBER))
    }

    @Test
    fun `a selection that ends at the start of a line leaves that line`() {
        assertEquals(Selected("- a\n- b\nc", 2, 8), Selected("a\nb\nc", 0, 4).listed(LineStart.BULLET))
    }

    @Test
    fun `a link goes on the selection, or shows its address without one`() {
        assertEquals(Selected("see [site](https://example.com) now", 31, 31), Selected("see site now", 4, 8).linked("https://example.com"))
        assertEquals(Selected("see [https://example.com](https://example.com)", 46, 46), Selected("see ", 4, 4).linked(" https://example.com "))
        assertEquals(
            listOf(Paragraph(listOf(Text("see "), Text("site", link = "https://example.com"), Text(" now")))),
            parseMarkdown(Selected("see site now", 4, 8).linked("https://example.com")!!.text),
        )
        assertEquals("[mail me](mailto:a@example.com)", Selected("mail me", 0, 7).linked("mailto:a@example.com")!!.text)
    }

    @Test
    fun `an address the web would not take makes no link`() {
        assertNull(Selected("x", 0, 1).linked("javascript:alert(1)"))
        assertNull(Selected("x", 0, 1).linked("example.com"))
        assertNull(Selected("x", 0, 1).linked(""))
    }
}
