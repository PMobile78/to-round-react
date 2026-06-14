import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { parseLocalDateTime } from '../utils/dateTime';

/**
 * TextOverlay: Renders bubble titles overlaid on the canvas.
 * Extracted from BubblesPage to legalize hooks and prevent remounts.
 *
 * Props:
 *   - bubbles: array of bubble objects with physics bodies
 *   - getFilteredBubbles: function/array of filtered bubbles (memoized)
 *   - foundBubblesIds: Set of bubble IDs matching search
 *   - debouncedBubblesSearchQuery: current search query string
 *   - isMobile: boolean
 *   - fontSize: base font size in px
 *   - themeMode: 'light' or 'dark'
 */
function TextOverlay({
  bubbles,
  getFilteredBubbles,
  foundBubblesIds,
  debouncedBubblesSearchQuery,
  isMobile,
  fontSize,
  themeMode,
  tags = []
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [positions, setPositions] = useState([]);
  const bubblesRef = useRef(bubbles);
  const filteredBubblesRef = useRef([]);

  // Обновляем ref при изменении bubbles - мемоизируем
  const updateRefs = useCallback(() => {
    bubblesRef.current = bubbles;
    filteredBubblesRef.current = getFilteredBubbles;
  }, [bubbles, getFilteredBubbles]);

  useEffect(() => {
    updateRefs();
  }, [updateRefs]);

  useEffect(() => {
    // Запускаем rAF-цикл всегда: engineRef.current ещё null на момент
    // монтирования дочернего компонента (родительский эффект, выставляющий
    // engineRef, выполняется позже), а пустой массив зависимостей не давал
    // эффекту перезапуститься. В dev это маскировал двойной вызов StrictMode,
    // в prod-сборке цикл не стартовал вовсе. Тело цикла само фильтрует пузыри
    // без готового тела, поэтому ранний выход не нужен.
    const updatePositions = () => {
      const filteredBubbles = filteredBubblesRef.current || [];
      const newPositions = filteredBubbles
        .filter(bubble => bubble && bubble.body && bubble.body.position)
        .map(bubble => ({
          id: bubble.id,
          x: bubble.body.position.x,
          y: bubble.body.position.y,
          radius: bubble.radius,
          title: bubble.title,
          dueDate: bubble.dueDate || null,
          tagId: bubble.tagId || null,
          status: bubble.status || null
        }));
      setPositions(prev => {
        if (prev.length === newPositions.length && newPositions.every((p, i) =>
          prev[i] && Math.round(prev[i].x) === Math.round(p.x) && Math.round(prev[i].y) === Math.round(p.y)
          && prev[i].dueDate === p.dueDate && prev[i].tagId === p.tagId
        )) return prev;
        return newPositions;
      });
      rafId = requestAnimationFrame(updatePositions);
    };

    // rAF синхронизирован с отрисовкой и сам приостанавливается на скрытой вкладке
    let rafId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Локаль для форматирования даты/времени (как в TaskList)
  const locale = useMemo(() => {
    const lang = (typeof i18n?.language === 'string' ? i18n.language : 'en') || 'en';
    return lang.startsWith('uk') ? 'uk-UA' : lang.startsWith('ru') ? 'ru-RU' : 'en-US';
  }, [i18n.language]);

  const isOverdue = useCallback((dueDate) => {
    const d = parseLocalDateTime(dueDate);
    return d ? d.getTime() < Date.now() : false;
  }, []);

  // Текст плашки: "due 18:00" если срок сегодня, иначе "due 14.06"
  const formatDueLabel = useCallback((dueDate) => {
    const d = parseLocalDateTime(dueDate);
    if (!d) return null;
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
    const text = sameDay
      ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
      : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    return `${t('bubbles.due')} ${text}`;
  }, [locale, t]);

  // Относительный день для подписи: today / tomorrow / дата
  const formatRelativeDay = useCallback((dueDate) => {
    const d = parseLocalDateTime(dueDate);
    if (!d) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startDue.getTime() - startToday.getTime()) / 86400000);
    if (diffDays === 0) return t('bubbles.today');
    if (diffDays === 1) return t('bubbles.tomorrow');
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  }, [locale, t]);

  // Плашка времени в правом верхнем углу пузыря
  const renderBubbleDue = useCallback((bubble) => {
    if (!bubble.dueDate) return null;
    const label = formatDueLabel(bubble.dueDate);
    if (!label) return null;

    const overdue = isOverdue(bubble.dueDate);
    const hasSearchQuery = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim();
    const opacity = hasSearchQuery ? (foundBubblesIds.has(bubble.id) ? 1 : 0.4) : 1;
    const offset = bubble.radius * 0.62;

    return (
      <Box
        key={`due-${bubble.id}`}
        sx={{
          position: 'absolute',
          left: bubble.x,
          top: bubble.y,
          transform: `translate(calc(-50% + ${offset}px), calc(-50% - ${offset}px))`,
          borderRadius: '99px',
          padding: '2px 9px',
          fontSize: 11.5,
          fontWeight: 600,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
          opacity,
          transition: 'opacity 0.3s ease',
          backgroundColor: overdue ? '#E26D8C' : alpha(theme.palette.background.paper, 0.85),
          color: overdue ? '#fff' : theme.palette.text.secondary,
          border: overdue ? 'none' : `1px solid ${theme.palette.divider}`
        }}
      >
        {label}
      </Box>
    );
  }, [formatDueLabel, isOverdue, debouncedBubblesSearchQuery, foundBubblesIds, theme]);

  // Мемоизируем рендер функцию для каждого пузыря
  const renderBubbleText = useCallback((bubble) => {
    // Функция для ограничения длины текста в зависимости от размера пузыря и шрифта
    const getMaxTitleLength = (radius, currentFontSize) => {
      // Базовые значения для шрифта 12px
      let baseLength;
      if (radius < 30) baseLength = 8;   // очень маленький пузырь
      else if (radius < 40) baseLength = 12;  // маленький пузырь
      else if (radius < 50) baseLength = 16;  // средний пузырь
      else baseLength = 20;                   // большой пузырь

      // Корректируем количество символов в зависимости от размера шрифта
      // Чем меньше шрифт, тем больше символов помещается (квадратичная зависимость)
      const fontSizeRatio = Math.pow(12 / currentFontSize, 1.5); // Более агрессивное увеличение
      return Math.round(baseLength * fontSizeRatio);
    };

    // Проверяем, найден ли пузырь в поиске
    const isFound = foundBubblesIds.has(bubble.id);
    const hasSearchQuery = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim();

    // Вычисляем текущий размер шрифта с учетом мобильности
    const currentFontSize = isMobile ? fontSize * 0.75 : fontSize;
    const maxLength = getMaxTitleLength(bubble.radius, currentFontSize);
    const truncatedTitle = bubble.title && bubble.title.length > maxLength
      ? bubble.title.substring(0, maxLength) + '...'
      : bubble.title;

    // Определяем стили в зависимости от поиска
    const textOpacity = hasSearchQuery ? (isFound ? 1 : 0.4) : 1;
    const textColor = theme.custom?.bubble?.label?.color ?? theme.palette.text.primary;

    const textShadow = theme.custom?.bubble?.label?.shadow
      ? (themeMode === 'light'
        ? '0 1px 2px rgba(255, 255, 255, 0.65)'
        : '0 1px 3px rgba(0, 0, 0, 0.5)')
      : 'none';

    // Подпись под заголовком: "<тег> · <срок>"
    const tagName = bubble.tagId ? tags.find(tag => tag.id === bubble.tagId)?.name : null;
    const relativeDay = bubble.dueDate ? formatRelativeDay(bubble.dueDate) : null;
    const subtitle = [tagName, relativeDay].filter(Boolean).join(' · ');

    return bubble.title ? (
      <Box
        key={bubble.id}
        sx={{
          position: 'absolute',
          left: bubble.x,
          top: bubble.y,
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: textColor,
          textShadow: textShadow,
          maxWidth: Math.max(bubble.radius * 1.6, 50),
          overflow: 'hidden',
          opacity: textOpacity,
          transition: 'opacity 0.3s ease'
        }}
      >
        <Typography
          sx={{
            fontSize: Math.max(
              isMobile ? fontSize * 0.75 : fontSize,
              Math.min(bubble.radius / (isMobile ? 2.2 : 3), isMobile ? fontSize * 1.2 : fontSize * 1.3)
            ),
            fontWeight: theme.custom?.bubble?.label?.weight ?? 600,
            lineHeight: 1.1,
            wordBreak: 'break-word'
          }}
        >
          {truncatedTitle}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontSize: Math.max(
                (isMobile ? fontSize * 0.75 : fontSize) * 0.7,
                Math.min(bubble.radius / (isMobile ? 3.2 : 4.3), isMobile ? fontSize * 0.85 : fontSize * 0.9)
              ),
              fontWeight: 500,
              opacity: 0.75,
              lineHeight: 1.2,
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    ) : null;
  }, [isMobile, fontSize, themeMode, foundBubblesIds, debouncedBubblesSearchQuery, theme, tags, formatRelativeDay]);

  return (
    <Box sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      {positions.map(renderBubbleText)}
      {positions.map(renderBubbleDue)}
    </Box>
  );
}

export default React.memo(TextOverlay);
