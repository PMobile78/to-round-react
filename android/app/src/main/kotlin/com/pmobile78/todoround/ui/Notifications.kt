package com.pmobile78.todoround.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LifecycleStartEffect
import com.pmobile78.todoround.notifications.notificationsOn

/**
 * While someone is signed in (stage 3 spec, 2.3 №1 and №6): [register]s this phone as a device of
 * the account whenever the screen comes up, asks for the permission to notify on Android 13+ if it
 * is not granted, and registers again after the answer and whenever the app comes back with
 * notifications switched on or off in the settings of Android.
 */
@Composable
fun RegisterThisDevice(register: () -> Unit) {
    val context = LocalContext.current
    // Whether notifications were on at the last registration; null before the first one. Not kept
    // over a restart of the app (MIUI often unloads it), so every opening registers again.
    var registeredWith by remember { mutableStateOf<Boolean?>(null) }
    // Kept over a turn of the screen, so that the dialog is not asked for twice.
    var asked by rememberSaveable { mutableStateOf(false) }
    fun registerNow() {
        registeredWith = notificationsOn(context)
        register()
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        if (registeredWith != notificationsOn(context)) registerNow()
    }
    LaunchedEffect(Unit) {
        registerNow()
        if (needsPermission(context) && !asked) {
            asked = true
            ask.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    LifecycleStartEffect(Unit) {
        val last = registeredWith
        if (last != null && last != notificationsOn(context)) registerNow()
        onStopOrDispose {}
    }
}

private fun needsPermission(context: Context): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
