package com.pmobile78.todoround

import android.app.Application
import com.pmobile78.todoround.data.Backend

class ToDoRoundApp : Application() {
    /** Firebase of this run: the project, or the local emulators when a debug build asks for them. */
    lateinit var backend: Backend
        private set

    override fun onCreate() {
        super.onCreate()
        backend = if (BuildConfig.EMULATORS) Backend.emulators(this) else Backend.project()
    }
}
