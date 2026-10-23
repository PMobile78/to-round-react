package com.pmobile78.todoround

import androidx.test.core.app.ApplicationProvider
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.MetadataChanges
import com.pmobile78.todoround.data.Backend
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.tasks.await
import java.util.UUID

/** The app's Firebase for the device tests, which may only ever be the local emulators (docs/android.md). */
fun emulatorBackend(): Backend {
    check(BuildConfig.EMULATORS) { "the device tests need a debug build with -Ptodoround.emulators=true" }
    return ApplicationProvider.getApplicationContext<ToDoRoundApp>().backend
}

/** A second client of the same emulators, which the tests use as the web: its changes reach the app through the server. */
fun webBackend(): Backend = web

private val web: Backend by lazy { Backend.emulators(ApplicationProvider.getApplicationContext(), name = "web") }

/** A fresh address for an account on the Auth emulator. */
fun newEmail(): String = "user-${UUID.randomUUID()}@example.com"

/** A new account [email] with the password "secret-1", signed in on this client; returns its uid. */
suspend fun Backend.signUp(email: String): String =
    auth.createUserWithEmailAndPassword(email, "secret-1").await().user!!.uid

/** A fresh account on the Auth emulator, signed in; returns its uid. */
suspend fun Backend.signUpNewUser(): String = signUp(newEmail())

/**
 * The document as the server has it. A listener waits for the server, where a one-off read gives
 * up after 10 s of a slow start ("the client is offline"); a refusal of the rules is thrown.
 */
suspend fun DocumentReference.fromServer(): DocumentSnapshot {
    val result = CompletableDeferred<DocumentSnapshot>()
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) result.completeExceptionally(error)
        else if (snapshot != null && !snapshot.metadata.isFromCache) result.complete(snapshot)
    }
    try {
        return result.await()
    } finally {
        registration.remove()
    }
}
