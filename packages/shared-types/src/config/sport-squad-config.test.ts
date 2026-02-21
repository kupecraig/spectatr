import { describe, it, expect } from 'vitest';
import { sportSquadConfig, getSportConfig, getPositionRequirement } from './sport-squad-config';

describe('sportSquadConfig', () => {
  it('should have maxPlayers defined as a positive number', () => {
    expect(sportSquadConfig.maxPlayers).toBeGreaterThan(0);
    expect(Number.isInteger(sportSquadConfig.maxPlayers)).toBe(true);
  });

  it('should have positions defined as an object', () => {
    expect(sportSquadConfig.positions).toBeDefined();
    expect(typeof sportSquadConfig.positions).toBe('object');
    expect(Object.keys(sportSquadConfig.positions).length).toBeGreaterThan(0);
  });

  it('should have all positions with valid structure', () => {
    Object.entries(sportSquadConfig.positions).forEach(([position, requirement]) => {
      expect(position).toBeTruthy();
      expect(requirement.min).toBeDefined();
      expect(requirement.max).toBeDefined();
      expect(requirement.required).toBeDefined();
      expect(requirement.label).toBeTruthy();
    });
  });

  it('should have position requirements with valid min/max/required values', () => {
    Object.entries(sportSquadConfig.positions).forEach(([position, requirement]) => {
      expect(requirement.min).toBeGreaterThan(0);
      expect(requirement.max).toBeGreaterThanOrEqual(requirement.min);
      expect(requirement.required).toBeGreaterThanOrEqual(requirement.min);
      expect(requirement.required).toBeLessThanOrEqual(requirement.max);
      expect(requirement.label).toBeTruthy();
    });
  });

  it('should have total required positions equal to max players', () => {
    const totalRequired = Object.values(sportSquadConfig.positions).reduce(
      (sum, req) => sum + req.required,
      0
    );
    expect(totalRequired).toBe(sportSquadConfig.maxPlayers);
  });

  it('should have consistent min/max/required for each position', () => {
    // Verify that required is within min/max bounds
    Object.entries(sportSquadConfig.positions).forEach(([position, requirement]) => {
      expect(requirement.required).toBeGreaterThanOrEqual(requirement.min);
      expect(requirement.required).toBeLessThanOrEqual(requirement.max);
    });
  });

  it('should have unique position keys', () => {
    const positions = Object.keys(sportSquadConfig.positions);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });

  it('should have position labels that are non-empty strings', () => {
    Object.values(sportSquadConfig.positions).forEach((requirement) => {
      expect(typeof requirement.label).toBe('string');
      expect(requirement.label.length).toBeGreaterThan(0);
    });
  });
});

describe('getSportConfig', () => {
  it('should return config for rugby-union', () => {
    const config = getSportConfig('rugby-union');
    
    expect(config).toBeDefined();
    expect(config.maxPlayers).toBeGreaterThan(0);
    expect(Object.keys(config.positions).length).toBeGreaterThan(0);
  });

  it('should throw error for unknown sport', () => {
    expect(() => getSportConfig('soccer' as any)).toThrow('Unknown sport: soccer');
    expect(() => getSportConfig('cricket' as any)).toThrow('Unknown sport: cricket');
    expect(() => getSportConfig('' as any)).toThrow('Unknown sport: ');
  });

  it('should return same instance as sportSquadConfig', () => {
    const config = getSportConfig('rugby-union');
    expect(config).toBe(sportSquadConfig);
  });

  it('should return config with valid structure', () => {
    const config = getSportConfig('rugby-union');
    
    expect(config.maxPlayers).toBeDefined();
    expect(config.positions).toBeDefined();
    expect(typeof config.positions).toBe('object');
  });
});

describe('getPositionRequirement', () => {
  it('should return requirement for first valid position', () => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    const requirement = getPositionRequirement(sportSquadConfig, firstPosition);
    
    expect(requirement).toBeDefined();
    expect(requirement?.min).toBeGreaterThan(0);
    expect(requirement?.max).toBeGreaterThanOrEqual(requirement?.min ?? 0);
    expect(requirement?.required).toBeGreaterThanOrEqual(requirement?.min ?? 0);
    expect(requirement?.label).toBeTruthy();
  });

  it('should return requirement for all valid positions', () => {
    const positions = Object.keys(sportSquadConfig.positions);
    
    positions.forEach((position) => {
      const requirement = getPositionRequirement(sportSquadConfig, position);
      expect(requirement).toBeDefined();
      expect(requirement?.label).toBeTruthy();
    });
  });

  it('should return undefined for invalid position', () => {
    const requirement = getPositionRequirement(sportSquadConfig, 'invalid_position_xyz');
    expect(requirement).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const requirement = getPositionRequirement(sportSquadConfig, '');
    expect(requirement).toBeUndefined();
  });

  it('should return undefined for non-existent position', () => {
    const nonExistentPosition = 'this_position_does_not_exist_12345';
    const requirement = getPositionRequirement(sportSquadConfig, nonExistentPosition);
    expect(requirement).toBeUndefined();
  });

  it('should handle case-sensitive position names', () => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    const upperCase = getPositionRequirement(sportSquadConfig, firstPosition.toUpperCase());
    const mixedCase = getPositionRequirement(sportSquadConfig, firstPosition.charAt(0).toUpperCase() + firstPosition.slice(1));
    
    // Position names are case-sensitive - should not match if casing is different
    if (firstPosition !== firstPosition.toUpperCase()) {
      expect(upperCase).toBeUndefined();
    }
    if (firstPosition !== firstPosition.charAt(0).toUpperCase() + firstPosition.slice(1)) {
      expect(mixedCase).toBeUndefined();
    }
  });

  it('should return correct requirement structure', () => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    const requirement = getPositionRequirement(sportSquadConfig, firstPosition);
    
    expect(requirement).toHaveProperty('min');
    expect(requirement).toHaveProperty('max');
    expect(requirement).toHaveProperty('required');
    expect(requirement).toHaveProperty('label');
  });
});
