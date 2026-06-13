import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * TextOverlay: Renders bubble titles overlaid on the canvas.
 * Extracted from BubblesPage to legalize hooks and prevent remounts.
 *
 * Props:
 *   - bubbles: array of bubble objects with physics bodies
 *   - getFilteredBubbles: function/array of filtered bubbles (memoized)
 *   - engineRef: Matter.Engine ref
 *   - foundBubblesIds: Set of bubble IDs matching search
 *   - debouncedBubblesSearchQuery: current search query string
 *   - isMobile: boolean
 *   - fontSize: base font size in px
 *   - themeMode: 'light' or 'dark'
 */
function TextOverlay({
  bubbles,
  getFilteredBubbles,
  engineRef,
  foundBubblesIds,
  debouncedBubblesSearchQuery,
  isMobile,
  fontSize,
  themeMode
}) {
  const theme = useTheme();
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
    if (!engineRef.current) return undefined;

    const updatePositions = () => {
      const filteredBubbles = filteredBubblesRef.current || [];
      const newPositions = filteredBubbles
        .filter(bubble => bubble && bubble.body && bubble.body.position)
        .map(bubble => ({
          id: bubble.id,
          x: bubble.body.position.x,
          y: bubble.body.position.y,
          radius: bubble.radius,
          title: bubble.title
        }));
      setPositions(prev => {
        if (prev.length === newPositions.length && newPositions.every((p, i) =>
          prev[i] && Math.round(prev[i].x) === Math.round(p.x) && Math.round(prev[i].y) === Math.round(p.y)
        )) return prev;
        return newPositions;
      });
      rafId = requestAnimationFrame(updatePositions);
    };

    // rAF синхронизирован с отрисовкой и сам приостанавливается на скрытой вкладке
    let rafId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
      </Box>
    ) : null;
  }, [isMobile, fontSize, themeMode, foundBubblesIds, debouncedBubblesSearchQuery, theme]);

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
    </Box>
  );
}

export default React.memo(TextOverlay);
