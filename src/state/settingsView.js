/**
 * Settings of data contract v2 (users/{uid}.settings, spec 3.5) <-> the values the UI keeps
 * using: filters as lists of tag ids, the list view as 'tasks', sorting by category as 'tag'.
 */

/** Filter ids the UI shows: null ("all") is every current category; deleted ones drop out. */
export const selectedTagIds = (categoryIds, tags) => {
    const ids = tags.map((tag) => tag.id);
    return categoryIds === null ? ids : categoryIds.filter((id) => ids.includes(id));
};

/** Back to settings: every current category selected is null, so later categories are shown too. */
export const categoryIdsFor = (tagIds, tags) => (tags.length > 0 && tags.every((tag) => tagIds.includes(tag.id))
    ? null
    : [...tagIds]);

export const mainViewForUi = (mainView) => (mainView === 'list' ? 'tasks' : 'bubbles');
export const mainViewForSettings = (mainView) => (mainView === 'tasks' ? 'list' : 'bubbles');

export const sortByForUi = (by) => (by === 'category' ? 'tag' : by);
export const sortByForSettings = (by) => (by === 'tag' ? 'category' : by);
