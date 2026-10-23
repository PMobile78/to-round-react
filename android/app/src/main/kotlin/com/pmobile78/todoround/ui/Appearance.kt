package com.pmobile78.todoround.ui

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.normalizeLanguage

/** How the app looks (spec 8): its [language], where null keeps the current one, and the night mode of AppCompat. */
data class Appearance(val language: Language?, val nightMode: Int)

/**
 * The appearance for the settings of the signed-in account. Signed out ([settings] null), the app
 * keeps the language chosen on the sign-in screen and follows the theme of the system.
 */
fun appearanceOf(settings: Settings?): Appearance = when (settings) {
    null -> Appearance(language = null, nightMode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
    else -> Appearance(
        language = settings.language,
        nightMode = when (settings.themeMode) {
            ThemeMode.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            ThemeMode.DARK -> AppCompatDelegate.MODE_NIGHT_YES
            ThemeMode.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        },
    )
}

/**
 * Applies the appearance through AppCompat, which recreates the screen on a change: only what
 * differs from the screen now is set, so the screen does not flicker after every sign-in.
 */
fun Appearance.apply() {
    if (AppCompatDelegate.getDefaultNightMode() != nightMode) AppCompatDelegate.setDefaultNightMode(nightMode)
    if (language != null && language != appLanguage()) showLanguage(language)
}

/** Switches the app to [language]; AppCompat keeps the choice, also on Android 12 (autoStoreLocales). */
fun showLanguage(language: Language) {
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language.wire))
}

/** Lets the app speak the language of the phone again, as before the first choice. */
fun followPhoneLanguage() {
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
}

/** The language the app shows now: the one chosen in the app, else the phone's ("uk*" → Ukrainian, else English). */
fun appLanguage(): Language {
    val chosen = AppCompatDelegate.getApplicationLocales()
    val locales = if (chosen.isEmpty) LocaleListCompat.getAdjustedDefault() else chosen
    return normalizeLanguage(locales[0]?.language)
}
