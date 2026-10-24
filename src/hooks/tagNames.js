/**
 * Pure tag-name helper, like tagColors.js: no React / Firestore / DOM.
 * The client keeps category names unique among the user's categories
 * (data contract v2, 3.2), compared without the spaces at their edges and in
 * lower case — the same rule as the Android app (stage 2, decision 19).
 */

const normalizeTagName = (name) => name.trim().toLowerCase();

export const isTagNameTaken = (tags, name, editingTag = null) => {
    const wanted = normalizeTagName(name);
    // The edited tag keeps its own name, in any case
    return tags.some(tag => tag.id !== editingTag?.id && normalizeTagName(tag.name) === wanted);
};
