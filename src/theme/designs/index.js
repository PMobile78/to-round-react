import { modern } from './modern';
import { classic } from './classic';

/**
 * Design skins registry
 * Maps design IDs to their module functions and metadata
 */

export const DESIGNS = {
  modern: {
    id: 'modern',
    labelKey: 'design.modern',
    previewColors: {
      primary: '#2f6bdb',
      secondary: '#FF6B6B',
      background: '#fafbfc',
    },
    module: modern,
  },
  classic: {
    id: 'classic',
    labelKey: 'design.classic',
    previewColors: {
      primary: '#3B7DED',
      secondary: '#FF6B6B',
      background: '#f5f5f5',
    },
    module: classic,
  },
  // Placeholder entries for future designs (implemented in later tasks)
  aurora: {
    id: 'aurora',
    labelKey: 'design.aurora',
    previewColors: {
      primary: '#a78bfa',
      secondary: '#f472b6',
      background: '#fef5ff',
    },
    module: null, // Implemented in Task 3
  },
  brutalist: {
    id: 'brutalist',
    labelKey: 'design.brutalist',
    previewColors: {
      primary: '#000000',
      secondary: '#ffffff',
      background: '#f5f5f5',
    },
    module: null, // Implemented in Task 3
  },
  clay: {
    id: 'clay',
    labelKey: 'design.clay',
    previewColors: {
      primary: '#d4a373',
      secondary: '#c17a5a',
      background: '#fdf8f5',
    },
    module: null, // Implemented in Task 4
  },
};

/**
 * Get design metadata by ID
 */
export const getDesignMetadata = (designId) => DESIGNS[designId];

/**
 * Get design module (theme factory) by ID
 */
export const getDesignModule = (designId) => {
  const design = DESIGNS[designId];
  return design?.module || null;
};

/**
 * List all registered design IDs
 */
export const getAllDesignIds = () => Object.keys(DESIGNS);

/**
 * List only designs with working implementations
 */
export const getWorkingDesignIds = () =>
  Object.keys(DESIGNS).filter((id) => DESIGNS[id].module !== null);
