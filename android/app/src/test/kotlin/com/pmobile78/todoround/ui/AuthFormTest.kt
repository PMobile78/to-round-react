package com.pmobile78.todoround.ui

import com.pmobile78.todoround.R
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class AuthFormTest {
    @Test
    fun `a sign-in needs an email and a password`() {
        assertEquals(R.string.auth_fill_all_fields, signInProblem("", "secret-1"))
        assertEquals(R.string.auth_fill_all_fields, signInProblem("olena@example.com", ""))
        assertNull(signInProblem("olena@example.com", "secret-1"))
    }

    @Test
    fun `a sign-up needs all but the name, the password twice and six characters`() {
        assertEquals(R.string.auth_fill_all_fields, signUpProblem("", "secret-1", "secret-1"))
        assertEquals(R.string.auth_fill_all_fields, signUpProblem("olena@example.com", "secret-1", ""))
        assertEquals(R.string.auth_password_mismatch, signUpProblem("olena@example.com", "secret-1", "secret-2"))
        assertEquals(R.string.auth_password_too_short, signUpProblem("olena@example.com", "12345", "12345"))
        assertNull(signUpProblem("olena@example.com", "123456", "123456"))
    }

    @Test
    fun `a reset email needs the email`() {
        assertEquals(R.string.auth_enter_email, resetProblem(""))
        assertNull(resetProblem("olena@example.com"))
    }
}
