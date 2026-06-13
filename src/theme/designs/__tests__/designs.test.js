import { describe, it, expect } from 'vitest';
import { modern } from '../modern';
import { classic } from '../classic';

describe('Design themes', () => {
  describe('modern design', () => {
    it('should return different themes for light and dark modes', () => {
      const lightTheme = modern('light');
      const darkTheme = modern('dark');

      expect(lightTheme.palette.primary.main).toBe('#2f6bdb');
      expect(darkTheme.palette.primary.main).toBe('#5589e8');
    });

    it('should have Inter font family', () => {
      const theme = modern('light');
      expect(theme.typography.fontFamily).toContain('Inter');
    });

    it('should have soft shape (borderRadius 12)', () => {
      const theme = modern('light');
      expect(theme.shape.borderRadius).toBe(12);
    });

    it('should have bubble stroke values for modern design', () => {
      const theme = modern('light');
      expect(theme.custom.bubble.strokeWidth).toBe(1.5);
      expect(theme.custom.bubble.highlightStrokeWidth).toBe(2.5);
    });

    it('should have light mode bubble fill styles', () => {
      const theme = modern('light');
      expect(theme.custom.bubble.fill.tagAlpha).toBe(0.10);
    });

    it('should have dark mode bubble fill styles', () => {
      const theme = modern('dark');
      expect(theme.custom.bubble.fill.tagAlpha).toBe(0.14);
    });
  });

  describe('classic design', () => {
    it('should have classic primary color #3B7DED', () => {
      const lightTheme = classic('light');
      const darkTheme = classic('dark');

      expect(lightTheme.palette.primary.main).toBe('#3B7DED');
      expect(darkTheme.palette.primary.main).toBe('#3B7DED');
    });

    it('should have Roboto font family', () => {
      const theme = classic('light');
      expect(theme.typography.fontFamily).toContain('Roboto');
    });

    it('should have sharp shape (borderRadius 4)', () => {
      const theme = classic('light');
      expect(theme.shape.borderRadius).toBe(4);
    });

    it('should have bubble stroke values for classic design', () => {
      const theme = classic('light');
      expect(theme.custom.bubble.strokeWidth).toBe(3);
      expect(theme.custom.bubble.highlightStrokeWidth).toBe(4);
    });

    it('should have classic fill style without tag alpha', () => {
      const theme = classic('light');
      expect(theme.custom.bubble.fill.tagAlpha).toBe(0);
      expect(theme.custom.bubble.fill.defaultFill).toBe('rgba(59, 125, 237, 0.08)');
    });
  });

  describe('design differences', () => {
    it('modern and classic should have different primary colors', () => {
      const modernTheme = modern('light');
      const classicTheme = classic('light');

      expect(modernTheme.palette.primary.main).not.toBe(classicTheme.palette.primary.main);
    });

    it('modern and classic should have different font families', () => {
      const modernTheme = modern('light');
      const classicTheme = classic('light');

      expect(modernTheme.typography.fontFamily).not.toBe(classicTheme.typography.fontFamily);
    });

    it('modern and classic should have different border radius', () => {
      const modernTheme = modern('light');
      const classicTheme = classic('light');

      expect(modernTheme.shape.borderRadius).not.toBe(classicTheme.shape.borderRadius);
    });

    it('modern and classic should have different stroke widths', () => {
      const modernTheme = modern('light');
      const classicTheme = classic('light');

      expect(modernTheme.custom.bubble.strokeWidth).not.toBe(classicTheme.custom.bubble.strokeWidth);
    });
  });

  describe('custom theme properties', () => {
    it('modern theme should have custom properties', () => {
      const theme = modern('light');
      expect(theme.custom).toBeDefined();
      expect(theme.custom.design).toBe('modern');
      expect(theme.custom.bubble).toBeDefined();
      expect(theme.custom.canvasBackground).toBeDefined();
      expect(theme.custom.backdrop).toBe('none');
    });

    it('classic theme should have custom properties', () => {
      const theme = classic('light');
      expect(theme.custom).toBeDefined();
      expect(theme.custom.design).toBe('classic');
      expect(theme.custom.bubble).toBeDefined();
      expect(theme.custom.canvasBackground).toBeDefined();
      expect(theme.custom.backdrop).toBe('none');
    });

    it('light mode should have different canvas background than dark', () => {
      const modernLight = modern('light');
      const modernDark = modern('dark');

      expect(modernLight.custom.canvasBackground).not.toBe(modernDark.custom.canvasBackground);
    });
  });
});
