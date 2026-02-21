import { describe, it, expect } from 'vitest';
import {
  fieldLayout,
  getAllPositions,
  getTotalPositions,
  findPositionById,
  getPositionsByType,
} from './fieldLayouts';

describe('fieldLayout configuration', () => {
  it('should have valid field layout structure', () => {
    expect(fieldLayout).toBeDefined();
    expect(fieldLayout.aspectRatio).toBeDefined();
    expect(fieldLayout.backgroundImage).toBeDefined();
    expect(Array.isArray(fieldLayout.rows)).toBe(true);
  });

  it('should have at least one row', () => {
    expect(fieldLayout.rows.length).toBeGreaterThan(0);
  });

  it('should have valid row structure', () => {
    fieldLayout.rows.forEach((row) => {
      expect(row.id).toBeDefined();
      expect(typeof row.id).toBe('string');
      expect(row.justifyContent).toBeDefined();
      expect(typeof row.justifyContent).toBe('string');
      expect(typeof row.spacing).toBe('number');
      expect(Array.isArray(row.positions)).toBe(true);
    });
  });

  it('should have valid position structure in all rows', () => {
    fieldLayout.rows.forEach((row) => {
      row.positions.forEach((position) => {
        expect(position.id).toBeDefined();
        expect(typeof position.id).toBe('string');
        expect(position.type).toBeDefined();
        expect(typeof position.type).toBe('string');
        expect(position.label).toBeDefined();
        expect(typeof position.label).toBe('string');
      });
    });
  });

  it('should have unique position IDs', () => {
    const allPositions = getAllPositions();
    const positionIds = allPositions.map((pos) => pos.id);
    const uniqueIds = new Set(positionIds);
    
    expect(uniqueIds.size).toBe(positionIds.length);
  });

  it('should have at least one position per row', () => {
    fieldLayout.rows.forEach((row) => {
      expect(row.positions.length).toBeGreaterThan(0);
    });
  });
});

describe('getAllPositions', () => {
  it('should return all positions as flat array', () => {
    const positions = getAllPositions();
    
    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);
  });

  it('should flatten positions from all rows', () => {
    const positions = getAllPositions();
    const manualCount = fieldLayout.rows.reduce(
      (sum, row) => sum + row.positions.length,
      0
    );
    
    expect(positions.length).toBe(manualCount);
  });

  it('should return positions with valid structure', () => {
    const positions = getAllPositions();
    
    positions.forEach((position) => {
      expect(position.id).toBeDefined();
      expect(position.type).toBeDefined();
      expect(position.label).toBeDefined();
    });
  });

  it('should preserve position data from source', () => {
    const positions = getAllPositions();
    const firstRowFirstPosition = fieldLayout.rows[0].positions[0];
    
    // First position in flat array should match first position in first row
    expect(positions[0].id).toBe(firstRowFirstPosition.id);
    expect(positions[0].type).toBe(firstRowFirstPosition.type);
    expect(positions[0].label).toBe(firstRowFirstPosition.label);
  });

  it('should maintain order from rows', () => {
    const positions = getAllPositions();
    let index = 0;
    
    fieldLayout.rows.forEach((row) => {
      row.positions.forEach((position) => {
        expect(positions[index].id).toBe(position.id);
        index++;
      });
    });
  });
});

describe('getTotalPositions', () => {
  it('should return total count as number', () => {
    const total = getTotalPositions();
    
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThan(0);
  });

  it('should match length of flattened positions array', () => {
    const total = getTotalPositions();
    const allPositions = getAllPositions();
    
    expect(total).toBe(allPositions.length);
  });

  it('should equal sum of positions across all rows', () => {
    const total = getTotalPositions();
    const manualTotal = fieldLayout.rows.reduce(
      (sum, row) => sum + row.positions.length,
      0
    );
    
    expect(total).toBe(manualTotal);
  });

  it('should be consistent across multiple calls', () => {
    const first = getTotalPositions();
    const second = getTotalPositions();
    
    expect(first).toBe(second);
  });
});

describe('findPositionById', () => {
  it('should find position by valid ID', () => {
    const allPositions = getAllPositions();
    const firstPosition = allPositions[0];
    
    const found = findPositionById(firstPosition.id);
    
    expect(found).toBeDefined();
    expect(found?.id).toBe(firstPosition.id);
    expect(found?.type).toBe(firstPosition.type);
    expect(found?.label).toBe(firstPosition.label);
  });

  it('should find all valid position IDs', () => {
    const allPositions = getAllPositions();
    
    allPositions.forEach((position) => {
      const found = findPositionById(position.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(position.id);
    });
  });

  it('should return undefined for invalid ID', () => {
    const found = findPositionById('invalid_position_id_xyz');
    expect(found).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const found = findPositionById('');
    expect(found).toBeUndefined();
  });

  it('should be case-sensitive', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstPosition = allPositions[0];
      const upperCaseId = firstPosition.id.toUpperCase();
      
      // Only test if uppercase is actually different
      if (upperCaseId !== firstPosition.id) {
        const found = findPositionById(upperCaseId);
        expect(found).toBeUndefined();
      }
    }
  });

  it('should return exact match only', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstPosition = allPositions[0];
      const partialId = firstPosition.id.substring(0, firstPosition.id.length - 1);
      
      const found = findPositionById(partialId);
      expect(found).toBeUndefined();
    }
  });
});

describe('getPositionsByType', () => {
  it('should return array for any type query', () => {
    const positions = getPositionsByType('any_type');
    expect(Array.isArray(positions)).toBe(true);
  });

  it('should return empty array for non-existent type', () => {
    const positions = getPositionsByType('non_existent_type_xyz');
    expect(positions).toEqual([]);
  });

  it('should return positions matching the type', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstType = allPositions[0].type;
      const matchingPositions = getPositionsByType(firstType);
      
      expect(matchingPositions.length).toBeGreaterThan(0);
      matchingPositions.forEach((position) => {
        expect(position.type).toBe(firstType);
      });
    }
  });

  it('should find all positions for each unique type', () => {
    const allPositions = getAllPositions();
    const uniqueTypes = [...new Set(allPositions.map((p) => p.type))];
    
    uniqueTypes.forEach((type) => {
      const positions = getPositionsByType(type);
      expect(positions.length).toBeGreaterThan(0);
      
      const manualCount = allPositions.filter((p) => p.type === type).length;
      expect(positions.length).toBe(manualCount);
    });
  });

  it('should return empty array for empty string', () => {
    const positions = getPositionsByType('');
    expect(positions).toEqual([]);
  });

  it('should be case-sensitive', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstType = allPositions[0].type;
      const upperCaseType = firstType.toUpperCase();
      
      // Only test if uppercase is actually different
      if (upperCaseType !== firstType) {
        const positions = getPositionsByType(upperCaseType);
        expect(positions).toEqual([]);
      }
    }
  });

  it('should preserve position data in results', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstType = allPositions[0].type;
      const matchingPositions = getPositionsByType(firstType);
      
      matchingPositions.forEach((position) => {
        expect(position.id).toBeDefined();
        expect(position.type).toBe(firstType);
        expect(position.label).toBeDefined();
      });
    }
  });

  it('should return consistent results across calls', () => {
    const allPositions = getAllPositions();
    if (allPositions.length > 0) {
      const firstType = allPositions[0].type;
      
      const first = getPositionsByType(firstType);
      const second = getPositionsByType(firstType);
      
      expect(first.length).toBe(second.length);
      expect(first).toEqual(second);
    }
  });
});

describe('field layout integration', () => {
  it('should have consistent data across all utility functions', () => {
    const allPositions = getAllPositions();
    const totalPositions = getTotalPositions();
    
    expect(allPositions.length).toBe(totalPositions);
  });

  it('should allow finding every position returned by getAllPositions', () => {
    const allPositions = getAllPositions();
    
    allPositions.forEach((position) => {
      const found = findPositionById(position.id);
      expect(found).toBeDefined();
      expect(found).toEqual(position);
    });
  });

  it('should categorize all positions by type', () => {
    const allPositions = getAllPositions();
    const uniqueTypes = [...new Set(allPositions.map((p) => p.type))];
    
    let categorizedCount = 0;
    uniqueTypes.forEach((type) => {
      const positions = getPositionsByType(type);
      categorizedCount += positions.length;
    });
    
    expect(categorizedCount).toBe(allPositions.length);
  });

  it('should have valid aspect ratio format', () => {
    expect(fieldLayout.aspectRatio).toMatch(/^\d+:\d+$/);
  });

  it('should have background image path', () => {
    expect(fieldLayout.backgroundImage).toBeTruthy();
    expect(typeof fieldLayout.backgroundImage).toBe('string');
  });
});
