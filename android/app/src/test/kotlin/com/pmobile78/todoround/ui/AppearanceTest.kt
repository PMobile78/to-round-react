package com.pmobile78.todoround.ui

import androidx.appcompat.app.AppCompatDelegate
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.defaultSettings
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AppearanceTest {
    @Test
    fun `signed out the app keeps its language and follows the theme of the system`() {
        assertEquals(Appearance(language = null, nightMode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM), appearanceOf(null))
    }

    @Test
    fun `signed in the app takes the language and the theme of the account`() {
        assertEquals(
            Appearance(Language.UK, AppCompatDelegate.MODE_NIGHT_YES),
            appearanceOf(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)),
        )
        assertEquals(
            Appearance(Language.EN, AppCompatDelegate.MODE_NIGHT_NO),
            appearanceOf(defaultSettings("en").copy(themeMode = ThemeMode.LIGHT)),
        )
        assertEquals(Appearance(Language.EN, AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM), appearanceOf(defaultSettings("en")))
    }
}
