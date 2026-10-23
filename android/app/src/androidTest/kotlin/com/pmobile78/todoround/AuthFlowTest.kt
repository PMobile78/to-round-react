package com.pmobile78.todoround

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextInput
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The screens on the emulators: what the owner does by hand, done by the test (spec, section 9).
 * The accounts a test prepares come from the web's client, so the app sees them only after the
 * sign-in on the screen.
 */
@RunWith(AndroidJUnit4::class)
class AuthFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()

    private fun text(id: Int, vararg args: Any): String = compose.activity.getString(id, *args)

    private fun waitFor(tag: String) =
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }

    private fun type(tag: String, value: String) = compose.onNodeWithTag(tag).performTextInput(value)

    // The screen shrinks above the keyboard, which changes its height even after it has opened (the
    // password layout is taller): a tap aimed a moment earlier can hit the part of the button the
    // screen has just cut off. The buttons of the form are pressed through their click action, and
    // only while they are enabled, as a tap would be.
    private fun press(tag: String) =
        compose.onNodeWithTag(tag).assertIsEnabled().performSemanticsAction(SemanticsActions.OnClick)

    // A keyboard leaves a space after an address it suggests; the app drops it, as the web's email
    // field does, so every address here is typed with one.
    private fun signInOnScreen(email: String, password: String) {
        waitFor("auth")
        type("email", "$email ")
        type("password", password)
        press("submit")
    }

    private fun signOutOnScreen() {
        compose.onNodeWithTag("menu").performClick()
        compose.onNodeWithTag("logout").performClick()
        compose.onNodeWithTag("logout_confirm").performClick()
        waitFor("auth")
    }

    /** An account created on the web's client, with the settings the web gave it. */
    private fun webAccount(email: String, settings: Settings) = runBlocking {
        val web = webBackend()
        val uid = web.signUp(email)
        SettingsRepository(web.db).createUserDoc(uid, settings)
        web.auth.signOut()
    }

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    @After
    fun forgetTheAppearance() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    @Test
    fun aNewAccountSignsUpOutAndInAgain() {
        val email = newEmail()
        waitFor("auth")
        compose.onNodeWithTag("tab_register").performClick()
        type("name", "Olena")
        type("email", "$email ")
        type("password", "secret-1")
        type("confirm", "secret-1")
        press("submit")
        // A new account has no tasks yet, and the list says so.
        waitFor("empty")
        assertEquals(email, backend.auth.currentUser?.email)

        signOutOnScreen()
        signInOnScreen(email, "secret-1")
        waitFor("home")
    }

    @Test
    fun aWrongPasswordAndAResetEmailAreShown() {
        val email = newEmail()
        webAccount(email, defaultSettings("en"))

        signInOnScreen(email, "wrong-1")
        waitFor("error")
        compose.onNodeWithTag("error").assertTextEquals(text(R.string.auth_error_wrong_password))

        press("forgot")
        waitFor("notice")
        compose.onNodeWithTag("notice").assertTextEquals(text(R.string.auth_reset_email_sent))
    }

    @Test
    fun theLanguageAndTheThemeOfTheAccountApplyAfterSignIn() {
        val email = newEmail()
        // The web has set this account to Ukrainian and the dark theme.
        webAccount(email, defaultSettings("uk").copy(themeMode = ThemeMode.DARK))
        waitFor("auth")
        compose.waitUntil(60_000) { AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM }
        assertNotEquals("uk", AppCompatDelegate.getApplicationLocales().toLanguageTags())

        signInOnScreen(email, "secret-1")
        compose.waitUntil(60_000) {
            AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_YES &&
                AppCompatDelegate.getApplicationLocales().toLanguageTags() == "uk"
        }
        waitFor("home")

        // Signed out, the app takes the theme and the language of the phone again, as the web does.
        signOutOnScreen()
        compose.waitUntil(60_000) {
            AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM &&
                AppCompatDelegate.getApplicationLocales().isEmpty
        }
    }

    @Test
    fun aSessionThatEndsByItselfTakesThePhoneLanguageAgain() {
        val email = newEmail()
        webAccount(email, defaultSettings("uk"))
        signInOnScreen(email, "secret-1")
        compose.waitUntil(60_000) { AppCompatDelegate.getApplicationLocales().toLanguageTags() == "uk" }
        waitFor("home")

        // Firebase ends the session without the menu, as when the password is changed elsewhere.
        backend.auth.signOut()
        waitFor("auth")
        compose.waitUntil(60_000) { AppCompatDelegate.getApplicationLocales().isEmpty }
    }

    @Test
    fun theTabShownKeepsWhatIsTyped() {
        waitFor("auth")
        type("email", "olena@example.com")
        // As on the web, only another tab starts with empty fields.
        compose.onNodeWithTag("tab_sign_in").performClick()
        compose.onNodeWithTag("email").assert(hasText("olena@example.com"))
    }
}
