package com.pmobile78.todoround.data

import androidx.annotation.StringRes
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.userProfileChangeRequest
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/** What came of a sign-in, a sign-up or a reset email: done, or the text that says why not. */
sealed interface AuthResult {
    data object Done : AuthResult

    data class Failed(@StringRes val message: Int) : AuthResult
}

/** Sign-in, sign-up, password reset and sign-out with Firebase Auth (spec 5), as the web's authService.js. */
class AccountRepository(private val auth: FirebaseAuth) {
    /** The signed-in user, live; null while signed out. */
    val user: Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signIn(email: String, password: String): AuthResult = attempt {
        auth.signInWithEmailAndPassword(email, password).await()
    }

    /** A new account, signed in; a [name] goes to the Firebase Auth profile, as on the web. */
    suspend fun signUp(name: String, email: String, password: String): AuthResult = attempt {
        val user = auth.createUserWithEmailAndPassword(email, password).await().user!!
        if (name.isNotBlank()) user.updateProfile(userProfileChangeRequest { displayName = name }).await()
    }

    /**
     * The password reset email in [language], without the web's "Continue" link: that link could
     * not lead back into the app (spec 5).
     */
    suspend fun sendPasswordReset(email: String, language: Language): AuthResult = attempt {
        auth.setLanguageCode(language.wire)
        auth.sendPasswordResetEmail(email).await()
    }

    fun signOut() {
        auth.signOut()
    }

    private suspend fun attempt(action: suspend () -> Unit): AuthResult = try {
        action()
        AuthResult.Done
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        AuthResult.Failed(authErrorMessage(e))
    }
}

/**
 * The text for a failure of Firebase Auth: the cases of the web's authService.js (spec 5), and a
 * wrong email or password as Firebase reports it under email enumeration protection.
 */
@StringRes
fun authErrorMessage(error: Exception): Int = when (error) {
    is FirebaseNetworkException -> R.string.auth_error_network
    is FirebaseTooManyRequestsException -> R.string.auth_error_too_many_requests
    is FirebaseAuthException -> when (error.errorCode) {
        "ERROR_USER_NOT_FOUND" -> R.string.auth_error_user_not_found
        "ERROR_WRONG_PASSWORD" -> R.string.auth_error_wrong_password
        "ERROR_INVALID_CREDENTIAL" -> R.string.auth_error_invalid_credential
        "ERROR_EMAIL_ALREADY_IN_USE" -> R.string.auth_error_email_in_use
        "ERROR_WEAK_PASSWORD" -> R.string.auth_error_weak_password
        "ERROR_INVALID_EMAIL" -> R.string.auth_error_invalid_email
        "ERROR_TOO_MANY_REQUESTS" -> R.string.auth_error_too_many_requests
        else -> R.string.auth_error_unexpected
    }
    else -> R.string.auth_error_unexpected
}
