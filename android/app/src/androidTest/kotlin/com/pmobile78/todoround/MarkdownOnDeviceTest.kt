package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Break
import com.pmobile78.todoround.core.markdown.Inline.Text
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.parseMarkdown
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The rules of the core with the regular expressions of Android, which are not those of the JDK the
 * JVM tests run on: the same descriptions give the blocks they give there and on the web.
 */
@RunWith(AndroidJUnit4::class)
class MarkdownOnDeviceTest {
    @Test
    fun emphasisFindsTheLettersAndSignsOfAnyAlphabet() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("«лапки»", bold = true), Text(", "), Text("é", italic = true), Text(" and "),
                        Text("x", italic = true), Text(" in snake_case_word, "), Text("both", bold = true, italic = true),
                        Text(" and "), Text("a ", bold = true), Text("b", bold = true, italic = true), Text(" c", bold = true),
                    ),
                ),
            ),
            parseMarkdown("**«лапки»**, *é* and _x_ in snake_case_word, ***both*** and **a *b* c**"),
        )
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("😀"), Text("a", italic = true), Text("😀 "), Text("é", italic = true), Text(" "),
                        Text("é", bold = true), Text("! a"), Text("b", bold = true), Text("c"),
                    ),
                ),
            ),
            parseMarkdown("😀*a*😀 _é_ **é**! a**b**c"),
        )
    }

    @Test
    fun escapesStrikesAndCode() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("foo"), Text("bar", italic = true), Text(" *escaped* "), Text("gone", strike = true), Text(" "),
                        Text("one", strike = true), Text(" "), Text("a ``b`` c", code = true), Text(" "), Text("a`b", code = true),
                    ),
                ),
            ),
            parseMarkdown("foo*bar* \\*escaped\\* ~~gone~~ ~one~ `a ``b`` c` ``a`b``"),
        )
    }

    @Test
    fun linksAndTheAddressesInText() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("x", link = "https://e.com/(y)"), Text(" "), Text("r", link = "https://ex.com/r"), Text(" "),
                        Text("https://a.b", link = "https://a.b"), Text(" "), Text("me@ex.org", link = "mailto:me@ex.org"), Text(" "),
                        Text("www.example.com/path", link = "http://www.example.com/path"), Text(". "),
                        Text("https://ex.com/q?a=1&b=2", link = "https://ex.com/q?a=1&b=2"), Text(") "),
                        Text("mail@ex.com", link = "mailto:mail@ex.com"),
                    ),
                ),
            ),
            parseMarkdown(
                "[x](https://e.com/(y)) [r][ref] <https://a.b> <me@ex.org> www.example.com/path. " +
                    "https://ex.com/q?a=1&b=2) mail@ex.com\n\n[ref]: https://ex.com/r \"title\"",
            ),
        )
    }

    @Test
    fun breaksAndRawHtmlAsItsText() {
        assertEquals(
            listOf(Paragraph(listOf(Text("line"), Break, Text("next"), Break, Text("last <b>raw</b> & # &copy;")))),
            parseMarkdown("line  \nnext\\\nlast <b>raw</b> &amp; &#35; &copy;"),
        )
    }

    @Test
    fun theMarksOfAChecklistAfterATableAndEmoji() {
        assertEquals(
            listOf(
                Paragraph(listOf(Text("| a | b |\n|---|:-:|\n| 1 | 2 |"))),
                TaskList(
                    listOf(
                        TaskItem(checked = false, mark = 34, blocks = listOf(Paragraph(listOf(Text("✅ emoji 😀"))))),
                        TaskItem(checked = true, mark = 51, blocks = listOf(Paragraph(listOf(Text("done", bold = true))))),
                    ),
                ),
            ),
            parseMarkdown("| a | b |\n|---|:-:|\n| 1 | 2 |\n\n- [ ] ✅ emoji 😀\n- [x] **done**"),
        )
    }
}
