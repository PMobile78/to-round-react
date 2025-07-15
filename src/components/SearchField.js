import React from 'react';
import {
    TextField,
    IconButton,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Search,
    Clear,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Универсальный компонент поля поиска
 * @param {string} searchQuery - текущий поисковый запрос
 * @param {Function} setSearchQuery - функция для изменения поискового запроса
 * @param {string} placeholder - placeholder для поля (опциональный)
 * @param {boolean} fullWidth - занимать всю доступную ширину (по умолчанию true)
 * @param {string} size - размер поля (small, medium, large)
 * @param {Object} sx - дополнительные стили
 * @param {boolean} autoFocus - автофокус на поле
 * @param {Function} onBlur - обработчик потери фокуса
 */
const SearchField = ({
    searchQuery,
    setSearchQuery,
    placeholder,
    fullWidth = true,
    size = 'small',
    sx = {},
    autoFocus = false,
    onBlur,
    ...otherProps
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const defaultPlaceholder = placeholder || t('bubbles.searchPlaceholder');

    return (
        <TextField
            fullWidth={fullWidth}
            size={size}
            variant="outlined"
            placeholder={defaultPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={autoFocus}
            onBlur={onBlur}
            InputProps={{
                startAdornment: (
                    <Search sx={{ color: 'text.secondary', marginRight: 1 }} />
                ),
                endAdornment: searchQuery && (
                    <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        sx={{ padding: 0.5 }}
                    >
                        <Clear fontSize="small" />
                    </IconButton>
                )
            }}
            sx={{
                '& .MuiInputBase-input': {
                    fontSize: isMobile ? 16 : 14 // Предотвращает zoom на iOS
                },
                '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                },
                ...sx
            }}
            {...otherProps}
        />
    );
};

export default SearchField; 