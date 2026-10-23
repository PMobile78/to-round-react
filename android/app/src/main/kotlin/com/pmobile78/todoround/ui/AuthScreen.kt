package com.pmobile78.todoround.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.AuthResult
import kotlinx.coroutines.launch

/** What stops a sign-in before Firebase is asked, as on the web's AuthForm; null when nothing does. */
@StringRes
fun signInProblem(email: String, password: String): Int? =
    if (email.isEmpty() || password.isEmpty()) R.string.auth_fill_all_fields else null

/** What stops a sign-up: every field but the name is needed, the same password twice, 6 characters at least. */
@StringRes
fun signUpProblem(email: String, password: String, confirm: String): Int? = when {
    email.isEmpty() || password.isEmpty() || confirm.isEmpty() -> R.string.auth_fill_all_fields
    password != confirm -> R.string.auth_password_mismatch
    password.length < 6 -> R.string.auth_password_too_short
    else -> null
}

/** What stops a password reset email: it needs the email. */
@StringRes
fun resetProblem(email: String): Int? = if (email.isEmpty()) R.string.auth_enter_email else null

/** Sign-in and sign-up (spec 5) with the language switch of the web's sign-in screen (spec 8). */
@Composable
fun AuthScreen(accounts: AccountRepository) {
    var register by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf("") }
    var failure by rememberSaveable { mutableStateOf<Int?>(null) }
    var notice by rememberSaveable { mutableStateOf<Int?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // As on the web, another tab starts with empty fields.
    fun switchTo(registerTab: Boolean) {
        register = registerTab
        name = ""
        email = ""
        password = ""
        confirm = ""
        failure = null
        notice = null
    }

    // Asks Firebase unless [problem] stops it; a failure shows its text, a success [done] if given.
    fun submit(@StringRes problem: Int?, @StringRes done: Int? = null, request: suspend () -> AuthResult) {
        failure = problem
        notice = null
        if (problem != null) return
        busy = true
        scope.launch {
            when (val result = request()) {
                AuthResult.Done -> notice = done
                is AuthResult.Failed -> failure = result.message
            }
            busy = false
        }
    }

    Scaffold(modifier = Modifier.testTag("auth")) { padding ->
        // The keyboard shrinks the screen instead of covering the fields and the buttons.
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LanguageSwitch(Modifier.align(Alignment.End))
            Image(
                painter = painterResource(R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(120.dp),
            )
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = stringResource(R.string.auth_welcome),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            PrimaryTabRow(selectedTabIndex = if (register) 1 else 0) {
                Tab(
                    selected = !register,
                    onClick = { switchTo(registerTab = false) },
                    text = { Text(stringResource(R.string.auth_login)) },
                    modifier = Modifier.testTag("tab_sign_in"),
                )
                Tab(
                    selected = register,
                    onClick = { switchTo(registerTab = true) },
                    text = { Text(stringResource(R.string.auth_register)) },
                    modifier = Modifier.testTag("tab_register"),
                )
            }
            if (register) Field(name, { name = it }, R.string.auth_display_name, "name")
            Field(email, { email = it }, R.string.auth_email, "email", KeyboardType.Email)
            Field(password, { password = it }, R.string.auth_password, "password", KeyboardType.Password, hidden = true)
            if (register) {
                Field(confirm, { confirm = it }, R.string.auth_confirm_password, "confirm", KeyboardType.Password, hidden = true)
            }
            failure?.let {
                Message(stringResource(it), MaterialTheme.colorScheme.error, "error")
            }
            notice?.let {
                Message(stringResource(it), MaterialTheme.colorScheme.primary, "notice")
            }
            Button(
                onClick = {
                    if (register) {
                        submit(signUpProblem(email, password, confirm)) { accounts.signUp(name, email, password) }
                    } else {
                        submit(signInProblem(email, password)) { accounts.signIn(email, password) }
                    }
                },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .testTag("submit"),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(stringResource(if (register) R.string.auth_register_button else R.string.auth_login_button))
                }
            }
            if (!register) {
                TextButton(
                    onClick = {
                        submit(resetProblem(email), R.string.auth_reset_email_sent) {
                            accounts.sendPasswordReset(email, appLanguage())
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.testTag("forgot"),
                ) {
                    Text(stringResource(R.string.auth_forgot_password))
                }
            }
        }
    }
}

@Composable
private fun Field(
    value: String,
    onValueChange: (String) -> Unit,
    @StringRes label: Int,
    tag: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    hidden: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(stringResource(label)) },
        singleLine = true,
        visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .testTag(tag),
    )
}

@Composable
private fun Message(text: String, color: Color, tag: String) {
    Text(
        text = text,
        color = color,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .testTag(tag),
    )
}

/** EN | UK, as on the web; until one is chosen, the app speaks the language of the phone (spec 8). */
@Composable
private fun LanguageSwitch(modifier: Modifier = Modifier) {
    val current = appLanguage()
    SingleChoiceSegmentedButtonRow(modifier) {
        Language.entries.forEachIndexed { index, language ->
            SegmentedButton(
                selected = language == current,
                onClick = { showLanguage(language) },
                shape = SegmentedButtonDefaults.itemShape(index, Language.entries.size),
                // The blue of the tabs and buttons, not the coral accent of the theme.
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    activeContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
                modifier = Modifier.testTag("language_${language.wire}"),
            ) {
                Text(language.wire.uppercase())
            }
        }
    }
}
