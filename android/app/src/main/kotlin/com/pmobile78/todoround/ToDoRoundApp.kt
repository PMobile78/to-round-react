package com.pmobile78.todoround

import android.app.Application
import android.util.Log
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import com.pmobile78.todoround.data.Backend
import com.pmobile78.todoround.data.DevicesRepository
import com.pmobile78.todoround.data.ThisDevice
import com.pmobile78.todoround.notifications.createRemindersChannel
import com.pmobile78.todoround.notifications.notificationsOn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class ToDoRoundApp : Application() {
    /** Firebase of this run: the project, or the local emulators when a debug build asks for them. */
    lateinit var backend: Backend
        private set

    /** This phone as a device of the signed-in user (stage 3 spec, section 5). */
    lateinit var thisDevice: ThisDevice
        private set

    /** Work that outlives a screen or a push, such as a write of this phone's device. */
    val scope = CoroutineScope(SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        backend = if (BuildConfig.EMULATORS) Backend.emulators(this) else Backend.project()
        thisDevice = ThisDevice(
            DevicesRepository(backend.db),
            fid = { FirebaseInstallations.getInstance().id.await() },
            // The emulators send no pushes, and the device tests do not wait for the network of
            // Google: a build for them reports its FID as FCM does after a registration.
            registerWithFcm = if (BuildConfig.EMULATORS) {
                { registered(FirebaseInstallations.getInstance().id.await()) }
            } else {
                { FirebaseMessaging.getInstance().register().await() }
            },
            notificationsOn = { notificationsOn(this) },
        )
        createRemindersChannel(this)
    }

    /** FCM has registered this phone with [address]: the device of the signed-in user gets it; a failure is only logged. */
    fun registered(address: String) {
        val uid = backend.auth.currentUser?.uid ?: return
        scope.launch {
            try {
                thisDevice.registered(uid, address)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w("ToDoRoundApp", "the device was not written", e)
            }
        }
    }
}
