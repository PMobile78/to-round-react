package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.AuthResult
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

/** Sign-in, sign-up, password reset and sign-out on the Auth emulator. */
@RunWith(AndroidJUnit4::class)
class AccountsTest {
    private val backend = emulatorBackend()
    private val accounts = AccountRepository(backend.auth)

    @Test
    fun signUpSignOutAndSignInAgain() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            assertEquals(AuthResult.Done, accounts.signUp("Olena", email, "secret-1"))
            val user = accounts.user.filterNotNull().first()
            assertEquals(email, user.email)
            assertEquals("Olena", user.displayName)

            accounts.signOut()
            assertNull(accounts.user.first())

            assertEquals(AuthResult.Done, accounts.signIn(email, "secret-1"))
            assertEquals(email, accounts.user.filterNotNull().first().email)
        }
    }

    @Test
    fun aWrongPasswordAndAnUnknownEmailHaveTheirTexts() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Failed(R.string.auth_error_wrong_password), accounts.signIn(email, "wrong-1"))
            assertEquals(AuthResult.Failed(R.string.auth_error_user_not_found), accounts.signIn(newEmail(), "secret-1"))
        }
    }

    @Test
    fun aTakenEmailAWeakPasswordAndABadEmailHaveTheirTexts() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Failed(R.string.auth_error_email_in_use), accounts.signUp("", email, "secret-1"))
            assertEquals(AuthResult.Failed(R.string.auth_error_weak_password), accounts.signUp("", newEmail(), "12345"))
            assertEquals(AuthResult.Failed(R.string.auth_error_invalid_email), accounts.signUp("", "not-an-email", "secret-1"))
        }
    }

    @Test
    fun aResetEmailGoesOutWithTheLanguageOfTheApp() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Done, accounts.sendPasswordReset(email, Language.UK))
            // Firebase writes the email in this language; the emulator puts lang=en in every link.
            assertEquals("uk", backend.auth.languageCode)
            val sent = sentEmails().filter { it.getString("email") == email }
            assertEquals(listOf("PASSWORD_RESET"), sent.map { it.getString("requestType") })
        }
    }
}
