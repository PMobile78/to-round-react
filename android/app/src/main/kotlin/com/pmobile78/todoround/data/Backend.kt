package com.pmobile78.todoround.data

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

/** Firebase Auth and Firestore of the one Firebase app this run works with. */
class Backend(val auth: FirebaseAuth, val db: FirebaseFirestore) {
    companion object {
        /** The project of google-services.json, todo-flutter-fb8bf (docs/android.md). */
        fun project(): Backend = Backend(FirebaseAuth.getInstance(), FirebaseFirestore.getInstance())

        /**
         * The local Auth and Firestore emulators of firebase.json with the web's emulator project
         * demo-to-round (spec 5), never the real project. The device reaches them at its own
         * 127.0.0.1 through adb reverse: Android 17 keeps apps out of the local network, 10.0.2.2
         * included, unless they hold ACCESS_LOCAL_NETWORK. Another [name] gives a second client of the
         * same emulators: the device tests use one as the web.
         */
        fun emulators(context: Context, name: String = "emulators"): Backend {
            val app = FirebaseApp.initializeApp(context, EMULATOR_OPTIONS, name)
            val auth = FirebaseAuth.getInstance(app).apply { useEmulator(EMULATOR_HOST, AUTH_EMULATOR_PORT) }
            val db = FirebaseFirestore.getInstance(app).apply { useEmulator(EMULATOR_HOST, FIRESTORE_EMULATOR_PORT) }
            return Backend(auth, db)
        }

        // The ports of firebase.json; the project and the made-up keys of .env.emulator.
        private const val EMULATOR_HOST = "127.0.0.1"
        private const val AUTH_EMULATOR_PORT = 9099
        private const val FIRESTORE_EMULATOR_PORT = 8180
        private val EMULATOR_OPTIONS = FirebaseOptions.Builder()
            .setProjectId("demo-to-round")
            .setApplicationId("1:000000000000:android:0000000000000000")
            .setApiKey("demo-api-key")
            .build()
    }
}
