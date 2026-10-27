package com.pmobile78.todoround.data

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * This phone as a device of the signed-in user (stage 3 spec, section 5). The document's id is the
 * FID of the app ([fid]). Its address for the pushes is what FCM reports once [registerWithFcm] has
 * registered the app ([registered]): the FID itself, or a token where Google Play services are too
 * old for FCM's registration by FID. While notifications are off on the phone ([notificationsOn])
 * the address is null. The app passes Firebase and Android here, the device tests their own.
 */
class ThisDevice(
    private val devices: DevicesRepository,
    private val fid: suspend () -> String,
    private val registerWithFcm: suspend () -> Unit,
    private val notificationsOn: () -> Boolean,
) {
    // One write at a time: a registration from the screen and one from FCM would otherwise both
    // create the document, and the rules refuse the second; a sign-out waits for a write under way.
    private val writing = Mutex()

    /**
     * After the sign-in and whenever the app opens (spec 2.3 №1): with notifications on, registers
     * with FCM, which then reports the address to [registered]; with them off, the device of [uid]
     * gets no address. A registration that fails (no network) throws, and nothing is written.
     */
    suspend fun register(uid: String) {
        if (notificationsOn()) registerWithFcm() else write(uid, null)
    }

    /** FCM has registered this phone with [address] (onRegistered): the device of [uid] gets it. */
    suspend fun registered(uid: String, address: String) {
        write(uid, address)
    }

    /** Before the sign-out (spec 2.3 №5): the device of [uid] is removed. */
    suspend fun unregister(uid: String) {
        writing.withLock { devices.unregister(uid, fid()) }
    }

    private suspend fun write(uid: String, address: String?) {
        writing.withLock { devices.register(uid, fid(), address.takeIf { notificationsOn() }) }
    }
}
