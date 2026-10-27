package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.data.DevicesRepository
import com.pmobile78.todoround.data.ThisDevice
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.IOException

/**
 * This phone as a device of its user on the Firestore emulator, under the rules of the repository
 * (stage 3 spec, section 5). The FID and the registration with FCM are the test's own.
 */
@RunWith(AndroidJUnit4::class)
class DevicesTest {
    private val backend = emulatorBackend()
    private val devices = DevicesRepository(backend.db)

    private fun device(uid: String, id: String) = backend.db.document("users/$uid/devices/$id")

    @Test
    fun aNewDeviceHasNotificationsOnAndAKnownOneGetsOnlyItsNewAddress() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            assertTrue(devices.register(uid, "fid-1", "fid-1"))
            val created = device(uid, "fid-1").fromServer()
            assertEquals("android", created.getString("platform"))
            assertEquals("fid-1", created.getString("fcmToken"))
            assertEquals(true, created.getBoolean("notificationsEnabled"))
            assertNotNull(created.getTimestamp("createdAt"))

            // The same address again writes nothing.
            assertFalse(devices.register(uid, "fid-1", "fid-1"))
            assertEquals(created.getTimestamp("updatedAt"), device(uid, "fid-1").fromServer().getTimestamp("updatedAt"))

            // Another client switched the reminders of this device off: a new address keeps that.
            device(uid, "fid-1").update(mapOf("notificationsEnabled" to false, "updatedAt" to FieldValue.serverTimestamp())).await()
            val switchedOff = device(uid, "fid-1").fromServer().getTimestamp("updatedAt")
            assertTrue(devices.register(uid, "fid-1", null))
            val known = device(uid, "fid-1").fromServer()
            assertTrue(known.contains("fcmToken"))
            assertNull(known.getString("fcmToken"))
            assertEquals(false, known.getBoolean("notificationsEnabled"))
            assertEquals(created.getTimestamp("createdAt"), known.getTimestamp("createdAt"))
            assertNotEquals(switchedOff, known.getTimestamp("updatedAt"))

            devices.unregister(uid, "fid-1")
            assertFalse(device(uid, "fid-1").fromServer().exists())
        }
    }

    @Test
    fun thisPhoneHasTheAddressFcmReportsAndOnlyWithNotificationsOn() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            var fid = "fid-2"
            var registrations = 0
            var notificationsOn = false
            // As FCM does: a registration is reported to onRegistered, here with the FID.
            lateinit var phone: ThisDevice
            phone = ThisDevice(
                devices,
                fid = { fid },
                registerWithFcm = {
                    registrations++
                    phone.registered(uid, fid)
                },
                notificationsOn = { notificationsOn },
            )

            phone.register(uid)
            assertEquals(0, registrations)
            val off = device(uid, "fid-2").fromServer()
            assertTrue(off.contains("fcmToken"))
            assertNull(off.getString("fcmToken"))

            notificationsOn = true
            phone.register(uid)
            assertEquals(1, registrations)
            assertEquals("fid-2", device(uid, "fid-2").fromServer().getString("fcmToken"))

            // Google Play services too old for the registration by FID: FCM reports a token.
            phone.registered(uid, "token-of-old-play-services")
            assertEquals("token-of-old-play-services", device(uid, "fid-2").fromServer().getString("fcmToken"))

            // FCM has given the app a new FID: the device is written under it.
            fid = "fid-3"
            phone.registered(uid, "fid-3")
            assertEquals("fid-3", device(uid, "fid-3").fromServer().getString("fcmToken"))

            phone.unregister(uid)
            assertFalse(device(uid, "fid-3").fromServer().exists())
        }
    }

    @Test
    fun twoRegistrationsAtOnceWriteOneDevice() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val phone = ThisDevice(devices, fid = { "fid-5" }, registerWithFcm = {}, notificationsOn = { true })
            // The screen's registration and FCM's own at the start of the app report at the same moment.
            listOf(async { phone.registered(uid, "fid-5") }, async { phone.registered(uid, "fid-5") }).awaitAll()
            assertEquals("fid-5", device(uid, "fid-5").fromServer().getString("fcmToken"))
        }
    }

    @Test
    fun aFailedRegistrationWithFcmWritesNothing() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val phone = ThisDevice(devices, fid = { "fid-4" }, registerWithFcm = { throw IOException("no network") }, notificationsOn = { true })
            assertTrue(runCatching { phone.register(uid) }.exceptionOrNull() is IOException)
            assertFalse(device(uid, "fid-4").fromServer().exists())
        }
    }
}
