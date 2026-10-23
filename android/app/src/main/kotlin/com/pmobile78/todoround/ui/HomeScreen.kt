package com.pmobile78.todoround.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme

/**
 * The screen of a signed-in user until the task list of sub-plan 1.3: the top bar with the menu
 * "Logout" (spec 7) and what has been read from Firestore.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
    Scaffold(
        modifier = Modifier.testTag("home"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = {
                    IconButton(onClick = { menu = true }, modifier = Modifier.testTag("menu")) {
                        Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.menu))
                    }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.auth_logout)) },
                            onClick = {
                                menu = false
                                confirmSignOut = true
                            },
                            modifier = Modifier.testTag("logout"),
                        )
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.home_signed_in_as, session.email), style = MaterialTheme.typography.titleMedium)
            val data = session.data
            if (data == null) {
                CircularProgressIndicator()
            } else {
                Text(stringResource(R.string.home_tasks, data.tasks.items.size))
                Text(stringResource(R.string.home_categories, data.categories.items.size))
                val invalid = data.tasks.invalid + data.categories.invalid
                if (invalid > 0) {
                    Text(stringResource(R.string.home_invalid, invalid), color = MaterialTheme.colorScheme.error)
                }
                if (data.tasks.fromCache || data.categories.fromCache) {
                    Text(stringResource(R.string.home_offline), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(stringResource(R.string.home_list_next), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(R.string.auth_logout_confirm)) },
            text = { Text(stringResource(R.string.auth_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmSignOut = false
                        onSignOut()
                    },
                    modifier = Modifier.testTag("logout_confirm"),
                ) {
                    Text(stringResource(R.string.auth_approve_logout))
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    ToDoRoundTheme {
        HomeScreen(
            Session.SignedIn(
                email = "olena@example.com",
                data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false)),
            ),
            onSignOut = {},
        )
    }
}
