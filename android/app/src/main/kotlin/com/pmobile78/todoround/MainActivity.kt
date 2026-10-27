package com.pmobile78.todoround

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.pmobile78.todoround.ui.AppViewModel
import com.pmobile78.todoround.ui.AuthScreen
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.RegisterThisDevice
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.appearanceOf
import com.pmobile78.todoround.ui.apply
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme

// AppCompat switches the language of the app on Android before 13 too (spec 8).
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ToDoRoundTheme {
                AppContent()
            }
        }
    }
}

/** The sign-in screen or the screen of the signed-in user, in the language and the theme of the session (spec 8). */
@Composable
fun AppContent(viewModel: AppViewModel = viewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val appearance = when (val current = session) {
        Session.Starting -> null
        Session.SignedOut -> appearanceOf(null)
        is Session.SignedIn -> current.data?.let { appearanceOf(it.settings) }
    }
    LaunchedEffect(appearance) {
        appearance?.apply()
    }
    // After the sign-in: the permission to notify, then this phone as a device (stage 3 spec, 2.3 №1).
    if (session is Session.SignedIn) RegisterThisDevice(viewModel::registerDevice)
    when (val current = session) {
        Session.Starting -> Unit
        Session.SignedOut -> AuthScreen(viewModel.accounts)
        is Session.SignedIn -> HomeScreen(
            current,
            onSignOut = viewModel::signOut,
            onSort = viewModel::setListSort,
            onFilter = viewModel::setListFilter,
            writeFailures = viewModel.writeFailures,
        )
    }
}
