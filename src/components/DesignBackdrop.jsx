import { useTheme } from '@mui/material/styles';

/**
 * DesignBackdrop
 *
 * Renders a decorative layer behind the bubbles canvas based on theme.custom.backdrop.
 * - 'none': renders null (no decorative layer)
 * - 'aurora': renders an aurora layer (animated neon gradient)
 * - 'dots': renders a dot-grid layer (theme-aware dot pattern)
 *
 * Positioned absolutely behind the canvas (z-index 0), not capturing pointer events.
 */
export function DesignBackdrop() {
  const theme = useTheme();
  const backdropType = theme.custom?.backdrop || 'none';

  switch (backdropType) {
    case 'aurora':
      return (
        <div className="design-backdrop design-backdrop--aurora" />
      );
    case 'dots':
      return (
        <div
          className="design-backdrop design-backdrop--dots"
          style={{
            '--dot-color': theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.14)'
              : 'rgba(0, 0, 0, 0.12)',
          }}
        />
      );
    case 'none':
    default:
      return null;
  }
}
