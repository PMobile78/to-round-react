package com.pmobile78.todoround

import android.Manifest
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.core.app.ActivityOptionsCompat
import androidx.lifecycle.Lifecycle
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.pmobile78.todoround.ui.RegisterThisDevice
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicInteger

/**
 * The permission to notify on Android 13+ (stage 3 spec, 2.3 №6): the app asks for it, and
 * registers this phone again once notifications come on in the settings of Android. The answer
 * comes from a registry of the test, not from the dialog of Android: the dialog pauses the app,
 * which Compose then cannot see, and now and then it misses a tap. android/device-tests.sh runs
 * this class on its own, before it gives the app the permission for the other tests.
 */
@RunWith(AndroidJUnit4::class)
class PermissionTest {
    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    // The app leaves the screen and comes back to it, as from the settings of Android.
    private fun backInTheApp() {
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
    }

    @Test
    fun theAppAsksAndRegistersAgainWhenNotificationsComeOn() {
        assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
        val asked = mutableListOf<Any?>()
        val registrations = AtomicInteger()
        // Every request gets "Don't allow".
        val answers = object : ActivityResultRegistry() {
            override fun <I, O> onLaunch(requestCode: Int, contract: ActivityResultContract<I, O>, input: I, options: ActivityOptionsCompat?) {
                asked += input
                dispatchResult(requestCode, false)
            }
        }
        compose.setContent {
            CompositionLocalProvider(
                LocalActivityResultRegistryOwner provides object : ActivityResultRegistryOwner {
                    override val activityResultRegistry = answers
                },
            ) {
                RegisterThisDevice { registrations.incrementAndGet() }
            }
        }
        compose.waitForIdle()

        // Registered with notifications off and asked once; "Don't allow" changes nothing.
        assertEquals(listOf(Manifest.permission.POST_NOTIFICATIONS), asked)
        assertEquals(1, registrations.get())
        // Back in the app with nothing changed: no new registration.
        backInTheApp()
        assertEquals(1, registrations.get())

        // Allowed later in the settings of Android: back in the app, it registers again.
        instrumentation.uiAutomation.grantRuntimePermission(instrumentation.targetContext.packageName, Manifest.permission.POST_NOTIFICATIONS)
        backInTheApp()
        assertEquals(2, registrations.get())
        assertEquals(1, asked.size)
    }
}
