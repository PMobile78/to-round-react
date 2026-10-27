package com.pmobile78.todoround.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.pmobile78.todoround.ToDoRoundApp
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.toggleTask
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.changeErrors
import com.pmobile78.todoround.core.model.changes
import com.pmobile78.todoround.core.model.descriptionChanges
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
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import java.time.Instant

/** The data of the signed-in user that the screens show. */
data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)

/** What the app shows. */
sealed interface Session {
    /** Firebase Auth has not told yet whether someone is signed in. */
    data object Starting : Session

    data object SignedOut : Session

    /**
     * [data] is null until the settings, the tasks and the categories have all been read, and
     * when they could not be: then [failed], and they no longer change.
     */
    data class SignedIn(val email: String, val data: UserData?, val failed: Boolean = false) : Session
}

/**
 * The session of the user [email] over the flow of their [data]: loading first, then the data.
 * A failure of the flow, a refusal of the rules say, stays on the screen as one (spec 7) instead
 * of loading for ever.
 */
fun signedInSession(email: String, data: Flow<UserData?>): Flow<Session.SignedIn> =
    data.map { Session.SignedIn(email, it) }
        .onStart { emit(Session.SignedIn(email, null)) }
        .catch {
            Log.w("AppViewModel", "the data of the account could not be read", it)
            emit(Session.SignedIn(email, null, failed = true))
        }

/** The session of the app: who is signed in and their data, live (spec 6). */
class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val backend = (application as ToDoRoundApp).backend
    val accounts = AccountRepository(backend.auth)
    private val tasks = TasksRepository(backend.db)
    private val categories = CategoriesRepository(backend.db)
    private val settings = SettingsRepository(backend.db)

    private var wasSignedIn = false

    // Signed out, the app speaks the language of the phone again, as the web does (spec 8): after
    // the menu's Logout and also when Firebase ends the session by itself. Lazily: the listeners
    // stay while the app is in the background, so a return to the app keeps the screen instead of
    // loading it again from the cache.
    @OptIn(ExperimentalCoroutinesApi::class)
    val session: StateFlow<Session> = accounts.user
        .onEach { user ->
            if (user == null && wasSignedIn) followPhoneLanguage()
            wasSignedIn = user != null
        }
        .flatMapLatest { user -> if (user == null) flowOf(Session.SignedOut) else signedIn(user) }
        .stateIn(viewModelScope, SharingStarted.Lazily, Session.Starting)

    /** Signs out; [session] then takes the language of the phone again. */
    fun signOut() {
        accounts.signOut()
    }

    private val writes = Writes(viewModelScope)

    /** Writes the server or the core refused: the screen shows a message (stage 2 spec, 2.2 №16, №17). */
    val writeFailures: Flow<Unit> = writes.failures

    /** The sort of the list, shared with the web (stage 2 spec, 2.2 №7). */
    fun setListSort(sort: ListSort) = write { uid -> settings.setListSort(uid, sort) }

    /** The filter of the list, shared with the web. */
    fun setListFilter(filter: ListFilter) = write { uid -> settings.setListFilter(uid, filter) }

    /** [action] on [task] (stage 2 spec, 2.2 №12); the core checks the task it leaves first (2.2 №16). */
    fun act(task: Task, action: TaskAction) {
        if (action == TaskAction.DELETE_FOREVER) {
            write { uid -> tasks.delete(uid, task.id) }
            return
        }
        val now = Instant.now()
        val changes = try {
            action.changes(task, deviceTimeZone(), now)!!
        } catch (e: RuntimeException) {
            // A due the core cannot step, beyond the years of the contract say, writes nothing.
            Log.w(TAG, "task ${task.id}: no changes for ${action.name}", e)
            writes.refuse()
            return
        }
        writeChanges(task, changes, now)
    }

    /** [item] of the description of [task] ticked or unticked (2.2 №2): the description is written whole. */
    fun toggle(task: Task, item: TaskItem) {
        val description = toggleTask(task.description, item) ?: return
        writeChanges(task, descriptionChanges(description), Instant.now())
    }

    // Changes the core accepts are written; the others are not sent, and the screen says so.
    private fun writeChanges(task: Task, changes: Map<String, Any?>, now: Instant) {
        val errors = changeErrors(task, changes, now)
        if (errors.isNotEmpty()) {
            Log.w(TAG, "task ${task.id}: ${errors.joinToString("; ")}")
            writes.refuse()
            return
        }
        write { uid -> tasks.update(uid, task.id, changes) }
    }

    // A write for the signed-in user; signed out, there is nothing to write.
    private fun write(change: suspend (uid: String) -> Unit) {
        val uid = backend.auth.currentUser?.uid ?: return
        writes.launch { change(uid) }
    }

    // A new account gets the language of the sign-in screen (spec 8).
    private fun signedIn(user: FirebaseUser): Flow<Session> =
        signedInSession(
            user.email.orEmpty(),
            combine(
                settings.settings(user.uid, appLanguage().wire),
                tasks.tasks(user.uid),
                categories.categories(user.uid),
            ) { settings, tasks, categories -> settings?.let { UserData(it, tasks, categories) } },
        )

    private companion object {
        const val TAG = "AppViewModel"
    }
}
