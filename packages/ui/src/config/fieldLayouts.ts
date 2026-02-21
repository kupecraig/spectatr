import fieldLayoutData from './fieldLayouts.json';

/**
 * Position configuration for a single player slot on the field
 */
export interface FieldPosition {
  id: string;
  type: string; // Maps to PlayerPosition enum (e.g., 'outside_back', 'center')
  label: string; // Display name (e.g., 'Fullback', 'Left Wing')
  offsetX?: number; // Horizontal offset in pixels for fine-tuning
  offsetY?: number; // Vertical offset in pixels for fine-tuning
}

/**
 * Row configuration containing multiple positions
 */
export interface FieldRow {
  id: string;
  justifyContent: string; // Flexbox justify-content value
  spacing: number; // MUI spacing units (1 = 8px)
  positions: FieldPosition[];
}

/**
 * Field layout configuration for the current sport instance
 */
export interface FieldLayout {
  aspectRatio: string; // e.g., '16:9'
  backgroundImage: string; // Path to field background SVG/image
  rows: FieldRow[];
}

/**
 * Field layout for the current sport instance (Rugby Union)
 */
export const fieldLayout: FieldLayout = fieldLayoutData;

/**
 * Get all positions from the field layout as a flat array
 * @returns Array of all positions
 */
export function getAllPositions(): FieldPosition[] {
  return fieldLayout.rows.flatMap((row) => row.positions);
}

/**
 * Get total number of positions in the field layout
 * @returns Total position count
 */
export function getTotalPositions(): number {
  return fieldLayout.rows.reduce((total, row) => total + row.positions.length, 0);
}

/**
 * Find a position by its ID
 * @param positionId - Position ID to find
 * @returns Position configuration or undefined
 */
export function findPositionById(positionId: string): FieldPosition | undefined {
  return getAllPositions().find((pos) => pos.id === positionId);
}

/**
 * Get all positions of a specific type
 * @param type - Position type (e.g., 'outside_back')
 * @returns Array of matching positions
 */
export function getPositionsByType(type: string): FieldPosition[] {
  return getAllPositions().filter((pos) => pos.type === type);
}

