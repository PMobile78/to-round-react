package com.pmobile78.todoround.data

import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuthException
import com.pmobile78.todoround.R
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AuthErrorsTest {
    @Test
    fun `the cases of the web's authService have their own texts`() {
        mapOf<String, Int>(
            "ERROR_USER_NOT_FOUND" to R.string.auth_error_user_not_found,
            "ERROR_WRONG_PASSWORD" to R.string.auth_error_wrong_password,
            "ERROR_EMAIL_ALREADY_IN_USE" to R.string.auth_error_email_in_use,
            "ERROR_WEAK_PASSWORD" to R.string.auth_error_weak_password,
            "ERROR_INVALID_EMAIL" to R.string.auth_error_invalid_email,
            "ERROR_TOO_MANY_REQUESTS" to R.string.auth_error_too_many_requests,
        ).forEach { (code, message) ->
            assertEquals(message, authErrorMessage(FirebaseAuthException(code, "detail")), code)
        }
    }

    @Test
    fun `a wrong email or password under email enumeration protection says so`() {
        assertEquals(
            R.string.auth_error_invalid_credential,
            authErrorMessage(FirebaseAuthException("ERROR_INVALID_CREDENTIAL", "detail")),
        )
    }

    @Test
    fun `no network and too many requests have their texts`() {
        assertEquals(R.string.auth_error_network, authErrorMessage(FirebaseNetworkException("offline")))
        assertEquals(R.string.auth_error_too_many_requests, authErrorMessage(FirebaseTooManyRequestsException("later")))
    }

    @Test
    fun `anything else is an unexpected error`() {
        assertEquals(
            R.string.auth_error_unexpected,
            authErrorMessage(FirebaseAuthException("ERROR_OPERATION_NOT_ALLOWED", "detail")),
        )
        assertEquals(R.string.auth_error_unexpected, authErrorMessage(IllegalStateException("?")))
    }
}
