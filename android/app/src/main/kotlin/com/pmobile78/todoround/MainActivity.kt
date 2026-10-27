package com.pmobile78.todoround

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.ui.AppViewModel
import com.pmobile78.todoround.ui.AuthScreen
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.TaskScreen
import com.pmobile78.todoround.ui.appearanceOf
import com.pmobile78.todoround.ui.apply
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

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

/**
 * The sign-in screen, or for the signed-in user the list and the screen of the task it opens, in
 * the language and the theme of the session (spec 8).
 */
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
    when (val current = session) {
        Session.Starting -> Unit
        Session.SignedOut -> AuthScreen(viewModel.accounts)
        is Session.SignedIn -> {
            // The task open on its screen, by its id: kept over a turn of the phone and an unloading of the app.
            var openTask by rememberSaveable { mutableStateOf<String?>(null) }
            // The list keeps its tab, search and place while a task is open.
            val screens = rememberSaveableStateHolder()
            val gone = remember { Channel<Unit>(Channel.CONFLATED) }
            // An action of the task screen closes it and runs once the list is back: a write the core
            // refuses at once is then said by the list, not by the screen that is going away.
            var pending by remember { mutableStateOf<Pair<Task, TaskAction>?>(null) }
            val taskId = openTask
            if (taskId != null) {
                TaskScreen(
                    taskId,
                    current,
                    onBack = { openTask = null },
                    onAction = { task, action -> pending = task to action },
                    onToggle = viewModel::toggle,
                    onGone = {
                        openTask = null
                        gone.trySend(Unit)
                    },
                    writeFailures = viewModel.writeFailures,
                )
            } else {
                screens.SaveableStateProvider("list") {
                    HomeScreen(
                        current,
                        onSignOut = viewModel::signOut,
                        onSort = viewModel::setListSort,
                        onFilter = viewModel::setListFilter,
                        writeFailures = viewModel.writeFailures,
                        onOpen = { openTask = it },
                        onAction = viewModel::act,
                        taskGone = remember(gone) { gone.receiveAsFlow() },
                    )
                }
                LaunchedEffect(pending) {
                    pending?.let { (task, action) -> viewModel.act(task, action) }
                    pending = null
                }
            }
        }
    }
}
