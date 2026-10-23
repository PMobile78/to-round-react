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

/** A fresh account on the Auth emulator, signed in; returns its uid. */
suspend fun Backend.signUpNewUser(): String =
    auth.createUserWithEmailAndPassword("user-${UUID.randomUUID()}@example.com", "secret-1").await().user!!.uid

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
