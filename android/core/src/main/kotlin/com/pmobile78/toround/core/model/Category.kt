package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.contract.validateCategory

/** A category of users/{uid}/categories (spec 3.2): [color] is one of the palette, [order] ascends. */
data class Category(val id: String, val name: String, val color: String, val order: Double)

/** The category of a backup-form record; throws IllegalArgumentException when it is not valid. */
fun categoryFromRecord(record: Map<String, Any?>): Category {
    val errors = validateCategory(record)
    require(errors.isEmpty()) { "category ${record["id"]}: ${errors.joinToString("; ")}" }
    return Category(
        id = record.string("id"),
        name = record.string("name"),
        color = record.string("color"),
        order = record.double("order"),
    )
}
