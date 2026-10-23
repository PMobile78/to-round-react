package com.pmobile78.todoround.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.pmobile78.todoround.ToDoRoundApp
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.CategoriesRepository
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.data.TasksRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn

/** The data of the signed-in user that the screens show. */
data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)

/** What the app shows. */
sealed interface Session {
    /** Firebase Auth has not told yet whether someone is signed in. */
    data object Starting : Session

    data object SignedOut : Session

    /** [data] is null until the settings, the tasks and the categories have all been read. */
    data class SignedIn(val email: String, val data: UserData?) : Session
}

/** The session of the app: who is signed in and their data, live (spec 6). */
class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val backend = (application as ToDoRoundApp).backend
    val accounts = AccountRepository(backend.auth)
    private val tasks = TasksRepository(backend.db)
    private val categories = CategoriesRepository(backend.db)
    private val settings = SettingsRepository(backend.db)

    // Lazily: the listeners stay while the app is in the background, so a return to the app
    // keeps the screen instead of loading it again from the cache.
    @OptIn(ExperimentalCoroutinesApi::class)
    val session: StateFlow<Session> = accounts.user
        .flatMapLatest { user -> if (user == null) flowOf(Session.SignedOut) else signedIn(user) }
        .stateIn(viewModelScope, SharingStarted.Lazily, Session.Starting)

    /** Signs out; the app takes the language of the phone again, as the web does (spec 8). */
    fun signOut() {
        accounts.signOut()
        followPhoneLanguage()
    }

    // A new account gets the language of the sign-in screen (spec 8).
    private fun signedIn(user: FirebaseUser): Flow<Session> =
        combine(
            settings.settings(user.uid, appLanguage().wire),
            tasks.tasks(user.uid),
            categories.categories(user.uid),
        ) { settings, tasks, categories ->
            Session.SignedIn(user.email.orEmpty(), settings?.let { UserData(it, tasks, categories) })
        }
            .onStart { emit(Session.SignedIn(user.email.orEmpty(), null)) }
            .catch { Log.w("AppViewModel", "the data of the account could not be read", it) }
}
