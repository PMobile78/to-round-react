package com.pmobile78.todoround

import android.os.ParcelFileDescriptor
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.MetadataChanges
import com.pmobile78.todoround.data.Backend
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
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

/**
 * A screenshot of the device as /data/local/tmp/todoround-screens/[name].png, which
 * android/device-tests.sh brings back to android/app/build/device-screens. The checks before it
 * prove the tree of the screen, not the picture on the display: the screenshot is looked at.
 */
fun screenshot(name: String) {
    shell("mkdir -p /data/local/tmp/todoround-screens")
    shell("screencap -p /data/local/tmp/todoround-screens/$name.png")
}

/** Runs [command] as the shell of the device and waits for it to end. */
private fun shell(command: String) {
    val output = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
    ParcelFileDescriptor.AutoCloseInputStream(output).use { it.readBytes() }
}

/** The emails the Auth emulator would have sent: its emulator/v1/…/oobCodes, newest last. */
suspend fun sentEmails(): List<JSONObject> = withContext(Dispatchers.IO) {
    val connection = URL("http://127.0.0.1:9099/emulator/v1/projects/demo-to-round/oobCodes").openConnection() as HttpURLConnection
    val body = try {
        connection.inputStream.bufferedReader().readText()
    } finally {
        connection.disconnect()
    }
    val codes = JSONObject(body).optJSONArray("oobCodes") ?: JSONArray()
    List(codes.length()) { codes.getJSONObject(it) }
}
