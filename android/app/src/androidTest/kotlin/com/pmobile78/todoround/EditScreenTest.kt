package com.pmobile78.todoround

import androidx.activity.OnBackPressedDispatcher
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextInputSelection
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.text.TextRange
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskForm
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.toForm
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.Edit
import com.pmobile78.todoround.ui.EditScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** The form of a task on its own (stage 2 spec, section 7): every field as the web's dialog has it. */
@RunWith(AndroidJUnit4::class)
class EditScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val here = ZoneId.systemDefault().id
    private val categories = listOf(Category("home", "Home", "#46a549", 1.0), Category("work", "Work", "#da3833", 2.0))

    // Now, for the screen: 20 October 2026, 10:00 UTC.
    private val clock = Clock.fixed(Instant.parse("2026-10-20T10:00:00Z"), ZoneOffset.UTC)
    private val saved = mutableListOf<Edit>()

    // What the caller tells of a save: its write is sent, or the core refused it.
    private var sent = true
    private var closed = 0
    private var gone = 0
    private lateinit var back: OnBackPressedDispatcher

    private fun task(
        due: Due? = Due("2026-11-02T09:30", ZoneId.systemDefault().id),
        reminders: List<Int> = listOf(60),
        repeat: Repeat? = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
    ) = Task(
        id = "t1",
        title = "Water the plants",
        description = "- [ ] pots",
        categoryId = "home",
        status = TaskStatus.ACTIVE,
        due = due,
        reminders = reminders,
        repeat = repeat,
        radius = 60,
        pulseMuted = false,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = null,
    )

    private fun session(tasks: List<Task>, fromCache: Boolean = false) =
        Session.SignedIn("olena@example.com", UserData(defaultSettings("en"), Loaded(tasks, 0, fromCache), Loaded(categories, 0, false)))

    private fun open(taskId: String?, session: Session.SignedIn) {
        compose.setContent {
            back = LocalOnBackPressedDispatcherOwner.current!!.onBackPressedDispatcher
            ToDoRoundTheme {
                EditScreen(taskId, session, onSave = { saved += it; sent }, onClose = { closed++ }, onGone = { gone++ }, clock = clock)
            }
        }
    }

    // A node of the form, which may be below the fold.
    private fun field(tag: String): SemanticsNodeInteraction = compose.onNodeWithTag(tag).performScrollTo()

    // A tap through the action of the node: a keyboard that opens moves the form under a touch, and a node
    // below the fold needs no scrolling.
    private fun press(tag: String) {
        compose.onNodeWithTag(tag).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun press(matcher: SemanticsMatcher) {
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun text(tag: String): String = compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.EditableText].text

    private fun reminders(): List<String> =
        compose.onAllNodesWithTag("form_reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() }

    // The pickers in their keyboard modes: the date as typed in English ("MMDDYYYY"), then the hour and the minute.
    private fun pickDue(date: String, hour: String, minute: String) {
        press("edit_due")
        press(hasContentDescription("Switch to text input mode"))
        compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextReplacement(date)
        press("date_ok")
        // Material 3 1.4 names this button after one mode or the other: "… for the time input".
        press(hasContentDescription("for the time input", substring = true))
        val time = compose.onAllNodes(hasSetTextAction() and hasAnyAncestor(isDialog()))
        time[0].performTextReplacement(hour)
        time[1].performTextReplacement(minute)
        press("time_ok")
    }

    @Test
    fun aNewTaskTakesEveryFieldOfTheForm() {
        open(null, session(emptyList()))
        compose.onNodeWithText("Create New Task").assertExists()
        compose.onNodeWithTag("edit_save").assertIsNotEnabled()

        field("edit_title").performTextReplacement(" Water the plants ")
        compose.onNodeWithTag("edit_save").assertIsEnabled()
        field("edit_description").performTextReplacement("pots")
        press("md_tasks")
        assertEquals("- [ ] pots", text("edit_description"))
        press("edit_category")
        press("category_home")
        pickDue("11022026", "09", "30")
        compose.onNodeWithText("11/02/2026 09:30").assertExists()
        press("remind_me")
        press("preset_60")
        press("reminder_save")
        press("remind_me")
        press("preset_custom")
        compose.onNodeWithTag("custom_count").performTextReplacement("2")
        press("reminder_unit_days")
        press("reminder_save")
        assertEquals(listOf("1 hour before", "2 days before"), reminders())
        press("repeat_switch")
        field("repeat_every").performTextReplacement("2")
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_5")
        press("weekday_1")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(60f) }
        compose.onNodeWithText("Bubble size: 60px").assertExists()
        screenshot("edit-en-light")

        press("edit_save")
        val form = TaskForm(
            title = " Water the plants ",
            description = "- [ ] pots",
            categoryId = "home",
            due = "2026-11-02T09:30",
            reminders = listOf(60, 2880),
            repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
            radius = 60,
        )
        assertEquals(listOf(Edit(null, Edit.of(null, here).opened, form, TextRange(10))), saved)
    }

    @Test
    fun aTaskOpensWithItsFieldsAndTheFormHoldsWhatTheUserChanges() {
        val task = task()
        open("t1", session(listOf(task)))
        compose.onNodeWithText("Edit Task").assertExists()
        assertEquals("Water the plants", text("edit_title"))
        assertEquals("- [ ] pots", text("edit_description"))
        compose.onNodeWithText("Home").assertExists()
        compose.onNodeWithText("11/02/2026 09:30").assertExists()
        // TalkBack does not reach the covered field: the button over it says the due.
        compose.onNodeWithTag("edit_due").assertContentDescriptionEquals("Due date: 11/02/2026 09:30")
        assertEquals(listOf("1 hour before"), reminders())
        field("repeat_switch").assertIsOn()
        assertEquals("2", text("repeat_every"))
        compose.onNodeWithText("Weeks").assertExists()
        field("weekday_1").assertIsSelected()
        field("weekday_2").assertIsNotSelected()
        field("weekday_5").assertIsSelected()
        compose.onNodeWithText("Bubble size: 60px").assertExists()

        press("edit_category")
        press("category_work")
        press("edit_save")
        val opened = task.toForm(here)
        assertEquals(listOf(Edit(task, opened, opened.copy(categoryId = "work"))), saved)
    }

    @Test
    fun clearingTheDueTakesItsRemindersAndRepeatAndAPassedDueIsOverdue() {
        open("t1", session(listOf(task(due = Due("2026-10-15T09:00", ZoneId.systemDefault().id), reminders = listOf(60, 1440)))))
        compose.onNodeWithText("Overdue").assertExists()
        press("due_clear")
        compose.onNodeWithText("Overdue").assertDoesNotExist()
        compose.onNodeWithTag("due_clear").assertDoesNotExist()
        compose.onNodeWithTag("edit_due").assertContentDescriptionEquals("Due date")
        assertEquals(emptyList<String>(), reminders())
        field("repeat_switch").assertIsOff().assertIsNotEnabled()
        field("remind_me").assertIsNotEnabled()
        compose.onNodeWithText("Set due date to add reminders").assertExists()
    }

    @Test
    fun remindersAreAddedAsOnTheWebUpToTen() {
        open("t1", session(listOf(task(reminders = listOf(60), repeat = null))))
        press("remind_me")
        compose.onNodeWithTag("preset_60").assertIsNotEnabled()
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        press("preset_custom")
        val count = compose.onNodeWithTag("custom_count")
        count.performTextReplacement("0")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        count.performTextReplacement("53")
        press("reminder_unit_weeks")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        // The keyboard of numbers has other keys too: only digits go in.
        count.performTextReplacement("5.2")
        assertEquals("52", text("custom_count"))
        compose.onNodeWithTag("reminder_save").assertIsEnabled()
        count.performTextReplacement("1")
        press("reminder_unit_hours")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        count.performTextReplacement("3")
        press("reminder_save")
        assertEquals(listOf("1 hour before", "3 hours before"), reminders())

        // Ten at most: then the button is off and says why; a removed one makes room again.
        listOf("4", "5", "6", "7", "8", "9", "10", "11").forEach { hours ->
            press("remind_me")
            press("preset_custom")
            compose.onNodeWithTag("custom_count").performTextReplacement(hours)
            press("reminder_save")
        }
        assertEquals(10, reminders().size)
        field("remind_me").assertIsNotEnabled()
        compose.onNodeWithText("At most 10 reminders").assertExists()
        press("reminder_delete_180")
        field("remind_me").assertIsEnabled()
        compose.onNodeWithTag("remind_me_hint").assertDoesNotExist()
    }

    @Test
    fun theRepeatTakesEveryFrom1To999AndTheDaysOfAWeek() {
        val task = task(repeat = null)
        open("t1", session(listOf(task)))
        field("repeat_every").assertIsNotEnabled()
        press("repeat_switch")
        assertEquals("1", text("repeat_every"))
        compose.onNodeWithText("Days").assertExists()
        field("repeat_every").performTextReplacement("12")
        field("repeat_every").performTextReplacement("0")
        field("repeat_every").performTextReplacement("1000")
        // Another field takes the focus: "Every" shows the number of the repeat again.
        compose.onNodeWithTag("edit_title").performSemanticsAction(SemanticsActions.RequestFocus)
        assertEquals("12", text("repeat_every"))
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_5")
        press("weekday_1")
        press("weekday_1")
        press("edit_save")
        assertEquals(Repeat(12, RepeatUnit.WEEKS, weekdays = listOf(5)), saved.single().form.repeat)
    }

    @Test
    fun theButtonsOfTheDescriptionWriteTheMarkdownOfTheWeb() {
        open(null, session(emptyList()))
        val description = field("edit_description")
        description.performTextReplacement("milk and bread")
        description.performTextInputSelection(TextRange(0, 4))
        press("md_bold")
        assertEquals("**milk** and bread", text("edit_description"))
        description.performTextInputSelection(TextRange(13, 18))
        press("md_link")
        val url = compose.onNodeWithTag("link_url")
        url.performTextReplacement("javascript:alert(1)")
        compose.onNodeWithTag("link_ok").assertIsNotEnabled()
        url.performTextReplacement("https://example.com")
        press("link_ok")
        assertEquals("**milk** and [bread](https://example.com)", text("edit_description"))
        description.performTextReplacement("milk\nbread")
        description.performTextInputSelection(TextRange(0, 10))
        press("md_numbers")
        assertEquals("1. milk\n2. bread", text("edit_description"))
    }

    @Test
    fun aDescriptionOver100000CharactersCannotBeSavedAndATitleStopsAt1000() {
        open(null, session(emptyList()))
        field("edit_title").performTextReplacement("t".repeat(1001))
        assertEquals(1000, text("edit_title").length)
        field("edit_description").performTextReplacement("x".repeat(100_001))
        // The line under the field is part of the field for TalkBack: it is in the unmerged tree.
        compose.onNodeWithTag("description_too_long", useUnmergedTree = true).assertExists()
        compose.onNodeWithTag("edit_save").assertIsNotEnabled()
        field("edit_description").performTextReplacement("x".repeat(100_000))
        compose.onNodeWithTag("description_too_long", useUnmergedTree = true).assertDoesNotExist()
        compose.onNodeWithTag("edit_save").assertIsEnabled()
    }

    @Test
    fun leavingAChangedFormAsksFirst() {
        open("t1", session(listOf(task())))
        press("edit_close")
        assertEquals(1, closed)
        compose.onNodeWithTag("discard_confirm").assertDoesNotExist()

        field("edit_title").performTextReplacement("Water the garden")
        press("edit_close")
        press("discard_keep")
        assertEquals(1, closed)
        // Back as it was: nothing to ask.
        field("edit_title").performTextReplacement("Water the plants")
        press("edit_close")
        assertEquals(2, closed)
        field("edit_title").performTextReplacement("Water the garden")
        // Back as the system sends it, through the dispatcher of the activity: a window of the system over the
        // app ("System UI isn't responding" on a loaded emulator) would keep Espresso waiting for the focus.
        compose.runOnUiThread { back.onBackPressed() }
        press("discard_confirm")
        assertEquals(3, closed)
        assertEquals(emptyList<Edit>(), saved)
    }

    @Test
    fun aSaveTheCoreRefusesLeavesTheFormAsTheUserHasItWithAMessage() {
        sent = false
        open("t1", session(listOf(task())))
        field("edit_title").performTextReplacement("Water the garden")
        press("edit_save")
        compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
        assertEquals("Water the garden", text("edit_title"))
        assertEquals(1, saved.size)
        assertEquals(0, closed)
    }

    @Test
    fun theFormSurvivesAnUnloadingOfTheAppAndComesBackBeforeTheData() {
        val task = task()
        var shown by mutableStateOf(session(listOf(task)))
        val restoration = StateRestorationTester(compose)
        restoration.setContent {
            ToDoRoundTheme {
                EditScreen("t1", shown, onSave = { saved += it; true }, onClose = { closed++ }, clock = clock)
            }
        }
        field("edit_title").performTextReplacement("Water the garden")
        field("edit_description").performTextInputSelection(TextRange(2, 5))
        press("due_clear")

        // The app comes back from an unloading before its data are read again.
        shown = Session.SignedIn("olena@example.com", null)
        restoration.emulateSavedInstanceStateRestore()
        assertEquals("Water the garden", text("edit_title"))
        compose.onNodeWithTag("due_clear").assertDoesNotExist()
        shown = session(listOf(task))
        press("edit_save")
        val opened = task.toForm(here)
        assertEquals(listOf(Edit(task, opened, opened.copy(title = "Water the garden", due = null, reminders = emptyList(), repeat = null), TextRange(2, 5))), saved)
    }

    @Test
    fun aTaskTheCacheDoesNotHaveIsWaitedForUntilTheServerSaysItIsGone() {
        var shown by mutableStateOf(session(emptyList(), fromCache = true))
        compose.setContent {
            ToDoRoundTheme {
                EditScreen("t1", shown, onSave = { saved += it; true }, onClose = { closed++ }, onGone = { gone++ }, clock = clock)
            }
        }
        compose.onNodeWithTag("loading").assertExists()
        assertEquals(0, gone)
        shown = session(emptyList(), fromCache = false)
        compose.waitForIdle()
        assertEquals(1, gone)
        compose.onAllNodesWithTag("edit_title").assertCountEquals(0)
    }
}
