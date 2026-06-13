import { modern } from './modern';
import { classic } from './classic';
import { aurora } from './aurora';
import { brutalist } from './brutalist';
import { clay } from './clay';

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
  aurora: {
    id: 'aurora',
    labelKey: 'design.aurora',
    previewColors: {
      primary: '#a78bfa',
      secondary: '#f472b6',
      background: '#0b0e1a',
    },
    module: aurora,
  },
  brutalist: {
    id: 'brutalist',
    labelKey: 'design.brutalist',
    previewColors: {
      primary: '#0066ff',
      secondary: '#ff0099',
      background: '#f5f0e6',
    },
    module: brutalist,
  },
  clay: {
    id: 'clay',
    labelKey: 'design.clay',
    previewColors: {
      primary: '#a084a0',
      secondary: '#d4a373',
      background: '#fdf8f5',
    },
    module: clay,
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
