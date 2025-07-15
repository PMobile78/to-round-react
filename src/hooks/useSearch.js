import { useState, useEffect, useMemo } from 'react';

/**
 * Универсальный хук для поиска с debouncing
 * @param {Array} items - массив элементов для поиска
 * @param {Array} tags - массив тегов для поиска по имени тега
 * @param {Function} searchFunction - функция поиска (опциональная, если нужна кастомная логика)
 * @param {number} debounceMs - задержка debouncing в миллисекундах (по умолчанию 300)
 * @returns {Object} объект с filteredItems, searchQuery, setSearchQuery, debouncedSearchQuery
 */
export const useSearch = (items = [], tags = [], searchFunction = null, debounceMs = 300) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Debounce search query updates
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [searchQuery, debounceMs]);

    // Default search function for bubbles/tasks
    const defaultSearchFunction = (items, query, tags) => {
        if (!query.trim()) {
            return items;
        }

        const lowerQuery = query.toLowerCase().trim();
        return items.filter(item => {
            // Search in title
            const titleMatch = (item.title || '').toLowerCase().includes(lowerQuery);

            // Search in description
            const descriptionMatch = (item.description || '').toLowerCase().includes(lowerQuery);

            // Search in tag name
            const tag = item.tagId ? tags.find(t => t.id === item.tagId) : null;
            const tagMatch = tag ? tag.name.toLowerCase().includes(lowerQuery) : false;

            return titleMatch || descriptionMatch || tagMatch;
        });
    };

    // Memoized search filtering
    const filteredItems = useMemo(() => {
        const searchFn = searchFunction || defaultSearchFunction;
        return searchFn(items, debouncedSearchQuery, tags);
    }, [items, debouncedSearchQuery, tags, searchFunction]);

    return {
        filteredItems,
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery
    };
};

export default useSearch; 