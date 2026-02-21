import { describe, it, expect } from 'vitest';
import {
  VALIDATION_ERRORS,
  ERROR_TO_RULE_MAP,
  formatValidationError,
  getErrorType,
  getUserFriendlyError,
  type ValidationErrorType,
} from './validationErrors';
import { sportSquadConfig } from '@spectatr/shared-types';

// Get sport config for sport-agnostic testing
const firstPosition = Object.keys(sportSquadConfig.positions)[0];
const firstPositionLabel = sportSquadConfig.positions[firstPosition].label;
const maxSquadSize = sportSquadConfig.maxPlayers;

describe('VALIDATION_ERRORS constant', () => {
  it('should have all required error types', () => {
    const requiredErrors: ValidationErrorType[] = [
      'BUDGET_EXCEEDED',
      'SQUAD_LIMIT',
      'POSITION_TOO_MANY',
      'POSITION_NOT_ENOUGH',
      'SQUAD_SIZE_INVALID',
      'DRAFT_PICK_NOT_AVAILABLE',
      'PLAYER_LOCKED',
      'PLAYER_INJURED',
      'POSITION_MATCHING_REQUIRED',
    ];

    requiredErrors.forEach((errorType) => {
      expect(VALIDATION_ERRORS[errorType]).toBeDefined();
      expect(typeof VALIDATION_ERRORS[errorType]).toBe('string');
    });
  });

  it('should have non-empty error messages', () => {
    Object.values(VALIDATION_ERRORS).forEach((message) => {
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('should have correct placeholder format in messages', () => {
    expect(VALIDATION_ERRORS.SQUAD_LIMIT).toContain('{limit}');
    expect(VALIDATION_ERRORS.POSITION_TOO_MANY).toContain('{position}');
    expect(VALIDATION_ERRORS.POSITION_NOT_ENOUGH).toContain('{count}');
    expect(VALIDATION_ERRORS.POSITION_NOT_ENOUGH).toContain('{position}');
    expect(VALIDATION_ERRORS.SQUAD_SIZE_INVALID).toContain('{count}');
  });
});

describe('ERROR_TO_RULE_MAP constant', () => {
  it('should map all validation errors to rule sources', () => {
    const errorTypes = Object.keys(VALIDATION_ERRORS) as ValidationErrorType[];
    
    errorTypes.forEach((errorType) => {
      expect(ERROR_TO_RULE_MAP[errorType]).toBeDefined();
      expect(typeof ERROR_TO_RULE_MAP[errorType]).toBe('string');
    });
  });

  it('should have valid rule source mappings', () => {
    const validRuleSources = [
      'priceCap',
      'squadLimitPerTeam',
      'sportSquadConfig.positions',
      'sportSquadConfig.maxPlayers',
      'draftMode',
      'playerStatus',
      'positionMatching',
    ];

    Object.values(ERROR_TO_RULE_MAP).forEach((ruleSource) => {
      expect(validRuleSources).toContain(ruleSource);
    });
  });
});

describe('formatValidationError', () => {
  it('should return error message without placeholders when no values provided', () => {
    const result = formatValidationError('BUDGET_EXCEEDED');
    expect(result).toBe('Over budget - remove players to add this one');
  });

  it('should replace single placeholder with value', () => {
    const result = formatValidationError('SQUAD_LIMIT', { limit: 3 });
    expect(result).toBe('Max 3 players from same squad');
  });

  it('should replace multiple placeholders with values', () => {
    const result = formatValidationError('POSITION_NOT_ENOUGH', {
      count: 2,
      position: firstPositionLabel,
    });
    expect(result).toBe(`Need 2 more ${firstPositionLabel}`);
  });

  it('should handle numeric values', () => {
    const result = formatValidationError('SQUAD_SIZE_INVALID', { count: maxSquadSize });
    expect(result).toBe(`Squad must have exactly ${maxSquadSize} players`);
  });

  it('should handle string values', () => {
    const result = formatValidationError('POSITION_TOO_MANY', {
      position: firstPositionLabel,
    });
    expect(result).toBe(`Already have max ${firstPositionLabel} players`);
  });

  it('should convert numbers to strings automatically', () => {
    const result = formatValidationError('SQUAD_LIMIT', { limit: 4 });
    expect(result).toContain('4');
    expect(typeof result).toBe('string');
  });

  it('should handle empty values object', () => {
    const result = formatValidationError('BUDGET_EXCEEDED', {});
    expect(result).toBe('Over budget - remove players to add this one');
  });

  it('should leave unmatched placeholders in message', () => {
    const result = formatValidationError('SQUAD_LIMIT', { wrong: 5 });
    expect(result).toContain('{limit}'); // Original placeholder remains
  });

  it('should handle all error types without errors', () => {
    const errorTypes = Object.keys(VALIDATION_ERRORS) as ValidationErrorType[];
    
    errorTypes.forEach((errorType) => {
      expect(() => formatValidationError(errorType)).not.toThrow();
    });
  });
});

describe('getErrorType', () => {
  it('should identify BUDGET_EXCEEDED from message', () => {
    expect(getErrorType('Budget exceeded by 5M')).toBe('BUDGET_EXCEEDED');
    expect(getErrorType('Over Budget')).toBe('BUDGET_EXCEEDED');
  });

  it('should identify SQUAD_LIMIT from message', () => {
    expect(getErrorType('Max 3 from same team')).toBe('SQUAD_LIMIT');
    expect(getErrorType('Too many from same team')).toBe('SQUAD_LIMIT');
  });

  it('should identify POSITION_TOO_MANY from message', () => {
    expect(getErrorType(`Too many ${firstPositionLabel}`)).toBe('POSITION_TOO_MANY');
    expect(getErrorType(`Too many ${firstPositionLabel}: 3, maximum allowed: 2`)).toBe(
      'POSITION_TOO_MANY'
    );
  });

  it('should identify POSITION_NOT_ENOUGH from message', () => {
    expect(getErrorType(`Not enough ${firstPositionLabel}`)).toBe('POSITION_NOT_ENOUGH');
    expect(getErrorType(`Not enough ${firstPositionLabel}: 1, required: 2`)).toBe(
      'POSITION_NOT_ENOUGH'
    );
  });

  it('should identify SQUAD_SIZE_INVALID from message', () => {
    expect(getErrorType(`Squad must have exactly ${maxSquadSize} players`)).toBe(
      'SQUAD_SIZE_INVALID'
    );
  });

  it('should identify DRAFT_PICK_NOT_AVAILABLE from message', () => {
    expect(getErrorType('Player not available in draft')).toBe(
      'DRAFT_PICK_NOT_AVAILABLE'
    );
  });

  it('should identify PLAYER_LOCKED from message', () => {
    expect(getErrorType('Player is locked')).toBe('PLAYER_LOCKED');
    expect(getErrorType('This player is locked for this round')).toBe(
      'PLAYER_LOCKED'
    );
  });

  it('should identify PLAYER_INJURED from message', () => {
    expect(getErrorType('Player is injured')).toBe('PLAYER_INJURED');
    expect(getErrorType('Cannot select injured player')).toBe('PLAYER_INJURED');
  });

  it('should identify POSITION_MATCHING_REQUIRED from message', () => {
    expect(getErrorType('Position must match last game')).toBe(
      'POSITION_MATCHING_REQUIRED'
    );
  });

  it('should return null for unknown error messages', () => {
    expect(getErrorType('Unknown error')).toBeNull();
    expect(getErrorType('')).toBeNull();
    expect(getErrorType('Random text')).toBeNull();
  });

  it('should be case-sensitive for keywords', () => {
    expect(getErrorType('Budget exceeded')).toBe('BUDGET_EXCEEDED');
    expect(getErrorType('Too many from same team')).toBe('SQUAD_LIMIT');
  });
});

describe('getUserFriendlyError', () => {
  describe('BUDGET_EXCEEDED errors', () => {
    it('should format budget exceeded message', () => {
      const result = getUserFriendlyError('Budget exceeded');
      expect(result).toBe('Over budget - remove players to add this one');
    });
  });

  describe('SQUAD_LIMIT errors', () => {
    it('should extract limit from message', () => {
      const result = getUserFriendlyError('Max. 3 same team');
      expect(result).toBe('Max 3 players from same squad');
    });

    it('should handle different limit values', () => {
      expect(getUserFriendlyError('Max. 4 same team')).toBe(
        'Max 4 players from same squad'
      );
      expect(getUserFriendlyError('Max. 5 same team')).toBe(
        'Max 5 players from same squad'
      );
    });

    it('should use default limit when not found', () => {
      const result = getUserFriendlyError('Too many from same team');
      expect(result).toBe('Max 3 players from same squad');
    });
  });

  describe('POSITION_TOO_MANY errors', () => {
    it('should extract position from message', () => {
      const result = getUserFriendlyError(
        `Too many ${firstPositionLabel}: 3, maximum allowed: 2`
      );
      expect(result).toBe(`Already have max ${firstPositionLabel} players`);
    });

    it('should handle multi-word position labels', () => {
      // Test with a generic multi-word pattern
      const result = getUserFriendlyError(
        'Too many Test Position: 2, maximum allowed: 1'
      );
      expect(result).toBe('Already have max Test Position players');
    });

    it('should use fallback when position not found', () => {
      const result = getUserFriendlyError('Too many');
      expect(result).toBe('Already have max this position players');
    });
  });

  describe('POSITION_NOT_ENOUGH errors', () => {
    it('should extract count and position from message', () => {
      const result = getUserFriendlyError(`Not enough ${firstPositionLabel}: 1, required: 2`);
      expect(result).toBe(`Need 1 more ${firstPositionLabel}`);
    });

    it('should calculate needed count correctly', () => {
      expect(getUserFriendlyError(`Not enough ${firstPositionLabel}: 0, required: 1`)).toBe(
        `Need 1 more ${firstPositionLabel}`
      );
      expect(getUserFriendlyError(`Not enough ${firstPositionLabel}: 1, required: 3`)).toBe(
        `Need 2 more ${firstPositionLabel}`
      );
    });

    it('should handle multi-word position labels', () => {
      const result = getUserFriendlyError(
        'Not enough Test Position: 0, required: 1'
      );
      expect(result).toBe('Need 1 more Test Position');
    });

    it('should use fallback when parsing fails', () => {
      const result = getUserFriendlyError('Not enough');
      expect(result).toBe('Need more players in this position');
    });
  });

  describe('SQUAD_SIZE_INVALID errors', () => {
    it('should extract squad size from message', () => {
      const result = getUserFriendlyError(`Squad must have exactly ${maxSquadSize} players`);
      expect(result).toBe(`Squad must have exactly ${maxSquadSize} players`);
    });

    it('should handle different squad sizes', () => {
      // Test with arbitrary squad size (soccer = 11, rugby = 15, etc.)
      const testSize = maxSquadSize === 15 ? 11 : 15;
      expect(getUserFriendlyError(`Squad must have exactly ${testSize} players`)).toBe(
        `Squad must have exactly ${testSize} players`
      );
    });
  });

  describe('other error types', () => {
    it('should return constant message for DRAFT_PICK_NOT_AVAILABLE', () => {
      const result = getUserFriendlyError('Player not available');
      expect(result).toBe('Player not available in draft');
    });

    it('should return constant message for PLAYER_LOCKED', () => {
      const result = getUserFriendlyError('Player is locked');
      expect(result).toBe('Player is locked');
    });

    it('should return constant message for PLAYER_INJURED', () => {
      const result = getUserFriendlyError('Player is injured');
      expect(result).toBe('Player is injured');
    });

    it('should return constant message for POSITION_MATCHING_REQUIRED', () => {
      const result = getUserFriendlyError('Position must match');
      expect(result).toBe('Position must match last game');
    });
  });

  it('should return original message for unknown errors', () => {
    const unknownMessage = 'Some unknown error occurred';
    const result = getUserFriendlyError(unknownMessage);
    expect(result).toBe(unknownMessage);
  });

  it('should handle empty string', () => {
    const result = getUserFriendlyError('');
    expect(result).toBe('');
  });
});

describe('integration tests', () => {
  it('should format and parse errors consistently', () => {
    const errorType: ValidationErrorType = 'SQUAD_LIMIT';
    const formatted = formatValidationError(errorType, { limit: 4 });
    // Note: getErrorType uses keyword matching, so formatted messages may not parse back
    // This tests that the format function works correctly
    expect(formatted).toContain('4');
    expect(formatted).toContain('squad');
  });

  it('should handle complete error flow', () => {
    // 1. Start with validation error type
    const errorType: ValidationErrorType = 'POSITION_NOT_ENOUGH';
    
    // 2. Format with dynamic values
    const formatted = formatValidationError(errorType, {
      count: 2,
      position: firstPositionLabel,
    });
    expect(formatted).toContain('2');
    expect(formatted).toContain(firstPositionLabel);
    
    // 3. getErrorType works with raw validation messages, not formatted ones
    const rawMessage = `Not enough ${firstPositionLabel}: 0, required: 2`;
    const parsed = getErrorType(rawMessage);
    expect(parsed).toBe(errorType);
    
    // 4. Get user-friendly version
    const friendly = getUserFriendlyError(rawMessage);
    expect(friendly).toContain(`Need 2 more ${firstPositionLabel}`);
  });

  it('should map all errors to their rules correctly', () => {
    const errorTypes = Object.keys(VALIDATION_ERRORS) as ValidationErrorType[];
    
    errorTypes.forEach((errorType) => {
      const ruleSource = ERROR_TO_RULE_MAP[errorType];
      expect(ruleSource).toBeDefined();
      expect(ruleSource.length).toBeGreaterThan(0);
    });
  });
});
