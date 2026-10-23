package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

// Device tests run on Android, whose method names before DEX 040 may not contain spaces: camelCase here.
@RunWith(AndroidJUnit4::class)
class BackendTest {
    @Test
    fun theEmulatorsAnswerWithTheRulesOfTheRepository() = runBlocking {
        // Right after the Android emulator has booted, the first answer of the server can take over a minute.
        withTimeout(180_000) {
            val backend = emulatorBackend()
            // The app's own client of the emulators, not the project of google-services.json.
            assertEquals("emulators", backend.db.app.name)
            assertEquals("demo-to-round", backend.db.app.options.projectId)
            val uid = backend.signUpNewUser()

            assertFalse(backend.db.document("users/$uid").fromServer().exists())
            val refused = runCatching { backend.db.document("users/someone-else").fromServer() }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }
}
