package com.pmobile78.todoround.data

import android.util.Log
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.QuerySnapshot
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.categoryFromRecord
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.taskFromRecord
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.tasks.await

/**
 * A live list of documents (spec 6): the [items] that passed the check of the core, how many
 * documents did not ([invalid]), and whether the data come only from this device's cache.
 */
data class Loaded<T>(val items: List<T>, val invalid: Int, val fromCache: Boolean)

/** The tasks of a user, users/{uid}/tasks. */
class TasksRepository(private val db: FirebaseFirestore) {
    /** Every task of [uid], live; a due zone this device does not know keeps the task (spec 6). */
    fun tasks(uid: String): Flow<Loaded<Task>> =
        db.collection("users").document(uid).collection("tasks")
            .loaded { id, data -> taskFromRecord(taskRecord(id, data), acceptUnknownZone = true) }
}

/** The categories of a user, users/{uid}/categories. */
class CategoriesRepository(private val db: FirebaseFirestore) {
    /** Every category of [uid], live. */
    fun categories(uid: String): Flow<Loaded<Category>> =
        db.collection("users").document(uid).collection("categories")
            .loaded { id, data -> categoryFromRecord(categoryRecord(id, data)) }
}

/** The settings of a user, users/{uid}.settings, and the creation of that document. */
class SettingsRepository(private val db: FirebaseFirestore) {
    /**
     * The settings of [uid], live, or null while users/{uid} cannot be read yet. When the server
     * confirms that the document does not exist, it is created with the defaults in
     * [screenLanguage] (contract, section 3.4), as the web does after a sign-up.
     */
    fun settings(uid: String, screenLanguage: String): Flow<Settings?> =
        db.collection("users").document(uid).changes()
            .onEach { if (!it.exists() && !it.metadata.isFromCache) createQuietly(uid, defaultSettings(screenLanguage)) }
            .map { if (it.exists()) settingsFromUserDoc(it.data, screenLanguage) else null }

    /**
     * Creates users/{uid} with [settings]. Never over an existing document: the rules refuse that
     * write (PERMISSION_DENIED), so the account another device has just set up keeps its settings.
     */
    suspend fun createUserDoc(uid: String, settings: Settings) {
        db.collection("users").document(uid).set(newUserDoc(settings)).await()
    }

    /** Writes the sort of the list of [uid], shared with the web (stage 2 spec, 2.2 №7); returns once the server has it. */
    suspend fun setListSort(uid: String, sort: ListSort) {
        db.collection("users").document(uid).update(listSortUpdate(sort)).await()
    }

    /** Writes the filter of the list of [uid], shared with the web; returns once the server has it. */
    suspend fun setListFilter(uid: String, filter: ListFilter) {
        db.collection("users").document(uid).update(listFilterUpdate(filter)).await()
    }

    private suspend fun createQuietly(uid: String, settings: Settings) {
        try {
            createUserDoc(uid, settings)
        } catch (e: FirebaseFirestoreException) {
            Log.w(TAG, "users/{uid} was not created", e)
        }
    }

    private companion object {
        const val TAG = "SettingsRepository"
    }
}

/** The devices of a user, users/{uid}/devices/{deviceId} (contract, 3.3), as the web's devices.js. */
class DevicesRepository(private val db: FirebaseFirestore) {
    /**
     * Writes this phone as the device [deviceId] of [uid] with [address]: a new device with
     * notifications on, a known one only its new address (stage 3 spec, 2.3 №2). It waits for the
     * server's copy of the document, so without a connection it waits. True when it wrote.
     */
    suspend fun register(uid: String, deviceId: String, address: String?): Boolean {
        val device = device(uid, deviceId)
        val known = device.changes().first { !it.metadata.isFromCache }
        when {
            !known.exists() -> device.set(newDeviceDoc(address)).await()
            known.getString("fcmToken") != address -> device.update(deviceAddressUpdate(address)).await()
            else -> return false
        }
        return true
    }

    /** Removes the device [deviceId] of [uid], as before the sign-out (contract, 3.3); returns once the server has it. */
    suspend fun unregister(uid: String, deviceId: String) {
        device(uid, deviceId).delete().await()
    }

    private fun device(uid: String, deviceId: String) =
        db.collection("users").document(uid).collection("devices").document(deviceId)
}

// Only the latest snapshot matters: a slow collector skips the ones in between (conflate).

/** Snapshots of the query, the changes of metadata included; a refusal ends the flow with its error. */
private fun Query.changes(): Flow<QuerySnapshot> = callbackFlow {
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) close(error) else if (snapshot != null) trySend(snapshot)
    }
    awaitClose { registration.remove() }
}.conflate()

/** Snapshots of the document, the changes of metadata included; a refusal ends the flow with its error. */
private fun DocumentReference.changes(): Flow<DocumentSnapshot> = callbackFlow {
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) close(error) else if (snapshot != null) trySend(snapshot)
    }
    awaitClose { registration.remove() }
}.conflate()

/** The documents of the query as [read] builds them; one the core refuses is counted instead. */
private fun <T> Query.loaded(read: (id: String, data: Map<String, Any?>) -> T): Flow<Loaded<T>> =
    changes().map { snapshot ->
        val items = snapshot.documents.mapNotNull { document ->
            val data = document.getData(DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) ?: emptyMap()
            try {
                read(document.id, data)
            } catch (e: IllegalArgumentException) {
                Log.w("Loaded", e.message.orEmpty())
                null
            }
        }
        Loaded(items, invalid = snapshot.size() - items.size, fromCache = snapshot.metadata.isFromCache)
    }
