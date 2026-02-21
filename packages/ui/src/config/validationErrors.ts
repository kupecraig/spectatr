/**
 * Validation error messages and constants
 */

export const VALIDATION_ERRORS = {
  BUDGET_EXCEEDED: 'Over budget - remove players to add this one',
  SQUAD_LIMIT: 'Max {limit} players from same squad',
  POSITION_TOO_MANY: 'Already have max {position} players',
  POSITION_NOT_ENOUGH: 'Need {count} more {position}',
  SQUAD_SIZE_INVALID: 'Squad must have exactly {count} players',
  DRAFT_PICK_NOT_AVAILABLE: 'Player not available in draft',
  PLAYER_LOCKED: 'Player is locked',
  PLAYER_INJURED: 'Player is injured',
  POSITION_MATCHING_REQUIRED: 'Position must match last game',
} as const;

/**
 * Validation error types mapped to league rules
 */
export type ValidationErrorType = keyof typeof VALIDATION_ERRORS;

/**
 * Map validation errors to their rule sources
 */
export const ERROR_TO_RULE_MAP: Record<ValidationErrorType, string> = {
  BUDGET_EXCEEDED: 'priceCap',
  SQUAD_LIMIT: 'squadLimitPerTeam',
  POSITION_TOO_MANY: 'sportSquadConfig.positions',
  POSITION_NOT_ENOUGH: 'sportSquadConfig.positions',
  SQUAD_SIZE_INVALID: 'sportSquadConfig.maxPlayers',
  DRAFT_PICK_NOT_AVAILABLE: 'draftMode',
  PLAYER_LOCKED: 'playerStatus',
  PLAYER_INJURED: 'playerStatus',
  POSITION_MATCHING_REQUIRED: 'positionMatching',
};

/**
 * Format validation error message with dynamic values
 * @param errorType - Type of validation error
 * @param values - Dynamic values to insert into message
 * @returns Formatted error message
 */
export function formatValidationError(
  errorType: ValidationErrorType,
  values?: Record<string, string | number>
): string {
  let message: string = VALIDATION_ERRORS[errorType];
  
  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }
  
  return message;
}

/**
 * Extract error type from validation error message
 * @param errorMessage - Raw error message from validation
 * @returns Error type if matched, null otherwise
 */
export function getErrorType(errorMessage: string): ValidationErrorType | null {
  if (errorMessage.includes('Budget')) return 'BUDGET_EXCEEDED';
  if (errorMessage.includes('same team')) return 'SQUAD_LIMIT';
  if (errorMessage.includes('Too many')) return 'POSITION_TOO_MANY';
  if (errorMessage.includes('Not enough')) return 'POSITION_NOT_ENOUGH';
  if (errorMessage.includes('exactly')) return 'SQUAD_SIZE_INVALID';
  if (errorMessage.includes('not available')) return 'DRAFT_PICK_NOT_AVAILABLE';
  if (errorMessage.includes('locked')) return 'PLAYER_LOCKED';
  if (errorMessage.includes('injured')) return 'PLAYER_INJURED';
  if (errorMessage.includes('must match')) return 'POSITION_MATCHING_REQUIRED';
  
  return null;
}

/**
 * Convert technical validation error to user-friendly message
 * @param errorMessage - Raw error message from validation
 * @returns User-friendly error message
 */
export function getUserFriendlyError(errorMessage: string): string {
  const errorType = getErrorType(errorMessage);
  
  if (!errorType) {
    return errorMessage; // Return original if we can't parse it
  }

  // Extract dynamic values from the original message
  switch (errorType) {
    case 'BUDGET_EXCEEDED':
      return 'Over budget - remove players to add this one';
    
    case 'SQUAD_LIMIT': {
      // Extract limit from "Max. 3 same team" or similar
      const limitMatch = errorMessage.match(/\d+/);
      const limit = limitMatch ? limitMatch[0] : '3';
      return `Max ${limit} players from same squad`;
    }
    
    case 'POSITION_TOO_MANY': {
      // Extract position from "Too many Center: 3, maximum allowed: 2"
      const positionMatch = errorMessage.match(/Too many (\w+(?:\s+\w+)?)/);
      const position = positionMatch ? positionMatch[1] : 'this position';
      return `Already have max ${position} players`;
    }
    
    case 'POSITION_NOT_ENOUGH': {
      // Extract count and position from "Not enough Center: 1, required: 2"
      const match = errorMessage.match(/Not enough (\w+(?:\s+\w+)?):?\s*(\d+),?\s*required:?\s*(\d+)/);
      if (match) {
        const position = match[1];
        const current = parseInt(match[2]);
        const required = parseInt(match[3]);
        const needed = required - current;
        return `Need ${needed} more ${position}`;
      }
      return 'Need more players in this position';
    }
    
    case 'SQUAD_SIZE_INVALID': {
      // Extract count from "Squad must have exactly 15 players"
      const countMatch = errorMessage.match(/\d+/);
      const count = countMatch ? countMatch[0] : '15';
      return `Squad must have exactly ${count} players`;
    }
    
    default:
      return VALIDATION_ERRORS[errorType];
  }
}
