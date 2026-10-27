package com.pmobile78.todoround.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LifecycleStartEffect
import com.pmobile78.todoround.R
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

/**
 * The window of the menu item "Reminders on this device" (stage 3 spec, section 7): whether this
 * phone may show the reminders, and what a phone of Xiaomi needs so that they reach the app while
 * it is closed. [xiaomi] and [allowed] are the phone's own unless a test gives them.
 */
@Composable
fun RemindersWindow(
    onClose: () -> Unit,
    xiaomi: Boolean = isXiaomi(),
    allowed: (Context) -> Boolean = ::notificationsOn,
) {
    val context = LocalContext.current
    // Read again when the app comes back from the settings of Android.
    var on by remember { mutableStateOf(allowed(context)) }
    LifecycleStartEffect(Unit) {
        on = allowed(context)
        onStopOrDispose {}
    }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(stringResource(R.string.reminders_title)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (on) {
                    Text(stringResource(R.string.reminders_on), modifier = Modifier.testTag("reminders_on"))
                } else {
                    Text(
                        stringResource(R.string.reminders_off),
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.testTag("reminders_off"),
                    )
                    TextButton(onClick = { context.startActivity(notificationSettings(context)) }, modifier = Modifier.testTag("notification_settings")) {
                        Text(stringResource(R.string.reminders_notification_settings))
                    }
                }
                val advice = if (xiaomi) R.string.reminders_xiaomi else R.string.reminders_battery
                Text(stringResource(advice), modifier = Modifier.testTag(if (xiaomi) "reminders_xiaomi" else "reminders_battery"))
            }
        },
        confirmButton = {
            TextButton(onClick = { context.startActivity(appSettings(context)) }, modifier = Modifier.testTag("app_settings")) {
                Text(stringResource(R.string.reminders_app_settings))
            }
        },
        dismissButton = {
            TextButton(onClick = onClose, modifier = Modifier.testTag("reminders_close")) {
                Text(stringResource(R.string.close))
            }
        },
    )
}

// MIUI and HyperOS run on the phones of Xiaomi, Redmi and POCO, which all name Xiaomi as their maker.
private fun isXiaomi(): Boolean = Build.MANUFACTURER.equals("Xiaomi", ignoreCase = true)

// "App info" of Android; on MIUI it holds "Autostart" and the battery saver of the app.
private fun appSettings(context: Context): Intent =
    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))

// The notification settings of the app, where its channel is too.
private fun notificationSettings(context: Context): Intent =
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)

private fun needsPermission(context: Context): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
