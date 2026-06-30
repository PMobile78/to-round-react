import { alpha } from '@mui/material/styles';

/**
 * Factory for building design theme functions.
 *
 * Takes a per-design config and returns a theme function: (mode) => themeObject
 * The factory encodes the common theme structure shared across all five designs;
 * per-design values are passed in the config.
 *
 * @param {Object} config
 * @param {string} config.id - Design ID (e.g., 'classic', 'modern')
 * @param {Object} config.palette - { light: {...}, dark: {...} } color values
 * @param {Object} config.tokens - { fontFamily, fontFamilyHeadings?, textTransform, borderRadius, shadowsBuilder }
 * @param {Object} config.bubble - { strokeWidth, highlightStrokeWidth, effect, effectParams?, labelWeight, ...}
 * @param {Object} config.headerStrip - { show, sx }
 * @param {string} config.backdrop - 'none', 'aurora', 'dots', or other backdrop type
 * @param {Object} config.buttonStyles - light/dark button styles
 * @param {Object} config.outlinedButtonStyles - light/dark outlined button styles
 * @param {Object} config.dialogPaper - { borderRadius }
 * @param {Function} [config.componentOverrides] - optional (c, mode) => { MuiXxx: {...} }
 *
 * @returns {Function} (mode) => themeObject
 */
export const buildDesign = (config) => (mode) => {
  const c = config.palette[mode];

  // Build shadows array
  const shadows = config.tokens.shadowsBuilder(c, mode, alpha);

  // Base component overrides shared across all designs
  const baseComponents = {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '& a': {
            color: c.primary,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
            '&:visited': {
              color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: config.tokens.borderRadius,
        },
      },
    },
  };

  // Merge per-design component overrides
  let components = { ...baseComponents };
  if (config.componentOverrides) {
    const designSpecificComponents = config.componentOverrides(c, mode, alpha);
    components = {
      ...components,
      ...designSpecificComponents,
    };
  }

  // Build bubble fill based on whether fill is a function or static value
  const bubbleFill = typeof config.bubble.fill === 'function'
    ? config.bubble.fill(c, mode)
    : config.bubble.fill;

  // Build buttonStyles based on whether it's a function or static value
  const buttonStyles = typeof config.buttonStyles === 'function'
    ? config.buttonStyles(c, mode, alpha)
    : config.buttonStyles;

  // Build outlinedButtonStyles based on whether it's a function or static value
  const outlinedButtonStyles = typeof config.outlinedButtonStyles === 'function'
    ? config.outlinedButtonStyles(c, mode, alpha)
    : config.outlinedButtonStyles;

  // Build headerStrip based on whether sx is a function or static value
  const headerStripSx = typeof config.headerStrip.sx === 'function'
    ? config.headerStrip.sx(c, mode, alpha)
    : config.headerStrip.sx;

  // Build defaultStroke based on whether it's a function or static value
  const defaultStroke = typeof config.bubble.defaultStroke === 'function'
    ? config.bubble.defaultStroke(c, mode)
    : (config.bubble.defaultStroke || c.primary);

  // Build labelShadow based on whether it's a function or static value
  const labelShadow = typeof config.bubble.labelShadow === 'function'
    ? config.bubble.labelShadow(mode)
    : (config.bubble.labelShadow !== undefined ? config.bubble.labelShadow : false);

  return {
    palette: {
      mode,
      primary: { main: c.primary },
      secondary: { main: c.secondary || '#FF6B6B' },
      success: { main: c.success || (mode === 'light' ? '#4caf50' : '#66bb6a') },
      warning: { main: c.warning || (mode === 'light' ? '#ff9800' : '#ffa726') },
      error: { main: c.error || (mode === 'light' ? '#f44336' : '#ef5350') },
      info: { main: c.info || (mode === 'light' ? '#2196f3' : '#42a5f5') },
      background: {
        default: c.backgroundDefault,
        paper: c.paper,
        bubbleView: c.bubbleView,
      },
      text: {
        primary: c.textPrimary,
        secondary: c.textSecondary,
      },
      divider: c.divider,
    },

    typography: {
      fontFamily: config.tokens.fontFamily,
      h1: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      h2: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      h3: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      h4: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      h5: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      h6: { fontWeight: config.tokens.fontWeightHeading || 600, ...config.tokens.headingExtras },
      button: { fontWeight: 500, textTransform: config.tokens.textTransform },
    },

    shape: {
      borderRadius: config.tokens.borderRadius,
    },

    shadows,

    components,

    custom: {
      design: config.id,
      bubble: {
        strokeWidth: config.bubble.strokeWidth,
        highlightStrokeWidth: config.bubble.highlightStrokeWidth,
        defaultStroke,
        fill: bubbleFill,
        effect: config.bubble.effect,
        effectParams: typeof config.bubble.effectParams === 'function'
          ? config.bubble.effectParams(c, mode)
          : (config.bubble.effectParams || null),
        label: {
          weight: config.bubble.labelWeight || 500,
          color: c.textPrimary,
          shadow: labelShadow,
        },
      },
      canvasBackground: c.bubbleView,
      headerStrip: {
        show: config.headerStrip.show,
        sx: headerStripSx,
      },
      backdrop: config.backdrop,
      buttonStyles,
      outlinedButtonStyles,
      dialogPaper: config.dialogPaper,
    },
  };
};
