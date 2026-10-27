package com.pmobile78.todoround.notifications

import android.annotation.SuppressLint
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pmobile78.todoround.ToDoRoundApp

/**
 * The pushes of the server and the registrations of FCM on this phone (stage 3 spec, sections 5
 * and 6). FCM calls both on a thread of its own, also when the app is not open. The app registers
 * by its installation id, so FCM calls onRegistered and never the deprecated onNewToken that Lint
 * still asks for.
 */
@SuppressLint("MissingFirebaseInstanceTokenRefresh")
class RemindersService : FirebaseMessagingService() {
    private val app: ToDoRoundApp
        get() = application as ToDoRoundApp

    override fun onMessageReceived(message: RemoteMessage) {
        onPush(this, signedIn = app.backend.auth.currentUser != null, message.data, message.sentTime)
    }

    /** FCM has registered this phone, after register() or by itself, with [installationId] as the address. */
    override fun onRegistered(installationId: String) {
        app.registered(installationId)
    }
}
