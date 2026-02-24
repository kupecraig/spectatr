import { describe, it, expect } from 'vitest';
import { validateSquad, validatePosition, validateSquadLimit } from './squad-validator';
import { sportSquadConfig } from '../config/sport-squad-config';
import type { Player } from '../schemas/player.schema';
import type { LeagueRules } from '../schemas/league.schema';

describe('validateSquad', () => {
  // Helper to get valid positions from config
  const getConfigPositions = () => Object.keys(sportSquadConfig.positions);
  const getFirstPosition = () => getConfigPositions()[0];
  
  // Helper to create minimal LeagueRules for testing
  const createTestLeagueRules = (overrides: Partial<LeagueRules> = {}): LeagueRules => ({
    draftMode: false,
    pricingModel: 'fixed',
    priceCapEnabled: false,
    priceCap: null,
    positionMatching: false,
    squadLimitPerTeam: null,
    sharedPool: false,
    transfersPerRound: 3,
    wildcardRounds: [],
    tripleCaptainRounds: [],
    benchBoostRounds: [],
    ...overrides,
  });
  
  // Helper to create valid squad from config
  const createValidSquadFromConfig = (costPerPlayer = 2000000): Player[] => {
    const players: Player[] = [];
    let playerId = 1;
    
    // Build squad according to config requirements
    Object.entries(sportSquadConfig.positions).forEach(([position, requirement]) => {
      for (let i = 0; i < requirement.required; i++) {
        players.push(createMockPlayer({
          id: playerId++,
          position: position as any,
          cost: costPerPlayer,
        }));
      }
    });
    
    return players;
  };

  // Helper to create mock player
  const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 1,
    feedId: 100,
    squadId: 1,
    firstName: 'Test',
    lastName: 'Player',
    position: getFirstPosition() as any,
    cost: 5000000, // 5M
    status: 'available',
    isLocked: false,
    stats: { 
      totalPoints: 0, 
      avgPoints: null, 
      lastRoundPoints: null, 
      positionRank: null, 
      nextFixture: null, 
      scores: {} 
    },
    selected: {
      percentage: 0,
    },
    imagePitch: 'test.png',
    imageProfile: 'test.png',
    ...overrides,
  });

  describe('valid squad validation', () => {
    it('should validate correct squad with correct number of players and positions from config', () => {
      const validSquad = createValidSquadFromConfig();

      const result = validateSquad(validSquad);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(validSquad).toHaveLength(sportSquadConfig.maxPlayers);
    });
  });

  describe('budget validation', () => {
    it('should reject squad over budget cap', () => {
      const expensiveSquad = createValidSquadFromConfig(10000000); // 10M each = 150M total

      const leagueRules = createTestLeagueRules({
        priceCapEnabled: true,
        priceCap: 42000000, // 42M cap
      });

      const result = validateSquad(expensiveSquad, sportSquadConfig, leagueRules);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Budget exceeded'))).toBe(true);
    });

    it('should accept squad under budget cap', () => {
      const affordableSquad = createValidSquadFromConfig(2000000); // 2M each = 30M total

      const leagueRules = createTestLeagueRules({
        priceCapEnabled: true,
        priceCap: 42000000,
      });

      const result = validateSquad(affordableSquad, sportSquadConfig, leagueRules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept squad at exact budget cap', () => {
      const budgetCap = 42000000;
      const costPerPlayer = budgetCap / sportSquadConfig.maxPlayers; // 2.8M each
      const exactBudgetSquad = createValidSquadFromConfig(costPerPlayer);

      const leagueRules = createTestLeagueRules({
        priceCapEnabled: true,
        priceCap: budgetCap,
      });

      const result = validateSquad(exactBudgetSquad, sportSquadConfig, leagueRules);

      expect(result.valid).toBe(true);
    });
  });

  describe('position requirements validation', () => {
    it('should reject squad with missing positions', () => {
      const firstPosition = getFirstPosition();
      const incompleteSquad: Player[] = new Array(sportSquadConfig.maxPlayers)
        .fill(null)
        .map((_, i) => createMockPlayer({ id: i + 1, position: firstPosition as any })); // All same position

      const result = validateSquad(incompleteSquad);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Not enough'))).toBe(true);
    });

    it('should reject squad with too many players in one position', () => {
      const positions = getConfigPositions();
      const firstPosition = positions[0];
      const firstPosMax = sportSquadConfig.positions[firstPosition].max;
      const tooMany = Math.min(10, firstPosMax + 3); // Exceed by 3
      
      const tooManySquad: Player[] = [
        ...new Array(tooMany)
          .fill(null)
          .map((_, i) => createMockPlayer({ id: i + 1, position: firstPosition as any })),
        ...new Array(sportSquadConfig.maxPlayers - tooMany)
          .fill(null)
          .map((_, i) => createMockPlayer({ id: tooMany + i + 1, position: positions[1] as any })),
      ];

      const result = validateSquad(tooManySquad);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Too many'))).toBe(true);
    });

    it('should reject squad with too few players in a position', () => {
      const tooFewSquad: Player[] = [
        createMockPlayer({ id: 1, position: 'outside_back' }),
        createMockPlayer({ id: 2, position: 'outside_back' }), // Only 2, need 3
        createMockPlayer({ id: 3, position: 'center' }),
        createMockPlayer({ id: 4, position: 'center' }),
        createMockPlayer({ id: 5, position: 'fly_half' }),
        createMockPlayer({ id: 6, position: 'scrum_half' }),
        createMockPlayer({ id: 7, position: 'back_row' }),
        createMockPlayer({ id: 8, position: 'back_row' }),
        createMockPlayer({ id: 9, position: 'back_row' }),
        createMockPlayer({ id: 10, position: 'lock' }),
        createMockPlayer({ id: 11, position: 'lock' }),
        createMockPlayer({ id: 12, position: 'prop' }),
        createMockPlayer({ id: 13, position: 'prop' }),
        createMockPlayer({ id: 14, position: 'hooker' }),
        createMockPlayer({ id: 15, position: 'hooker' }), // Extra hooker instead of outside back
      ];

      const result = validateSquad(tooFewSquad);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Not enough'))).toBe(true);
    });
  });

  describe('squad limit validation', () => {
    it('should reject squad exceeding max players from same team', () => {
      // Create squad with 5 players from squadId 1 (exceeds max of 4)
      const squad = createValidSquadFromConfig();
      // Override first 5 players to be from same squad
      squad[0].squadId = 1;
      squad[1].squadId = 1;
      squad[2].squadId = 1;
      squad[3].squadId = 1;
      squad[4].squadId = 1; // 5th player from squad 1

      const leagueRules = createTestLeagueRules({
        squadLimitPerTeam: 4,
      });

      const result = validateSquad(squad, sportSquadConfig, leagueRules);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Max. 4 players from same team'))).toBe(true);
    });

    it('should accept squad at max players from same team', () => {
      // Create squad with exactly 4 players from each of multiple squads
      const squad = createValidSquadFromConfig();
      const maxPerTeam = 4;
      
      // Distribute players across teams at exactly the limit
      squad.forEach((player, index) => {
        player.squadId = Math.floor(index / maxPerTeam) + 1;
      });

      const leagueRules = createTestLeagueRules({
        squadLimitPerTeam: maxPerTeam,
      });

      const result = validateSquad(squad, sportSquadConfig, leagueRules);

      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should reject empty squad', () => {
      const result = validateSquad([]);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes(`must have exactly ${sportSquadConfig.maxPlayers} players`))).toBe(true);
    });

    it('should handle null values gracefully', () => {
      const squadWithNulls = [
        createMockPlayer({ stats: null as any }),
        ...new Array(14)
          .fill(null)
          .map((_, i) => createMockPlayer({ id: i + 2 })),
      ];

      const result = validateSquad(squadWithNulls);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });
});

describe('validatePosition', () => {
  it('should return true for valid position strings from config', () => {
    const positions = Object.keys(sportSquadConfig.positions);
    
    // Test all positions from config
    positions.forEach(position => {
      expect(validatePosition(position)).toBe(true);
    });
  });

  it('should return false for invalid position strings', () => {
    expect(validatePosition('invalid_position')).toBe(false);
    expect(validatePosition('goalkeeper')).toBe(false);
    expect(validatePosition('')).toBe(false);
    expect(validatePosition(null)).toBe(false);
    expect(validatePosition(undefined)).toBe(false);
    expect(validatePosition(123)).toBe(false);
  });
});

describe('validateSquadLimit', () => {
  const createPlayer = (id: number, squadId: number): Player => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    return {
      id,
      squadId,
      position: firstPosition as any,
      cost: 5000000,
      feedId: 100,
      firstName: 'Test',
      lastName: 'Player',
      status: 'available',
      isLocked: false,
      stats: { 
        totalPoints: 0, 
        avgPoints: null, 
        lastRoundPoints: null, 
        positionRank: null, 
        nextFixture: null, 
        scores: {} 
      },
      selected: {
        percentage: 0,
      },
      imagePitch: 'test.png',
      imageProfile: 'test.png',
    } as Player;
  };

  it('should allow adding player when under squad limit', () => {
    const existingPlayers = [
      createPlayer(1, 1),
      createPlayer(2, 1),
      createPlayer(3, 1), // 3 from squad 1
    ];

    const newPlayer = createPlayer(4, 1); // Adding 4th from squad 1

    const result = validateSquadLimit(existingPlayers, newPlayer, 4);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject adding player when at squad limit', () => {
    const existingPlayers = [
      createPlayer(1, 1),
      createPlayer(2, 1),
      createPlayer(3, 1),
      createPlayer(4, 1), // Already 4 from squad 1
    ];

    const newPlayer = createPlayer(5, 1); // Trying to add 5th

    const result = validateSquadLimit(existingPlayers, newPlayer, 4);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max. 4 same team');
  });

  it('should allow adding player from different squad', () => {
    const existingPlayers = [
      createPlayer(1, 1),
      createPlayer(2, 1),
      createPlayer(3, 1),
      createPlayer(4, 1), // 4 from squad 1
    ];

    const newPlayer = createPlayer(5, 2); // Adding from squad 2

    const result = validateSquadLimit(existingPlayers, newPlayer, 4);

    expect(result.valid).toBe(true);
  });

  it('should handle empty squad', () => {
    const newPlayer = createPlayer(1, 1);

    const result = validateSquadLimit([], newPlayer, 4);

    expect(result.valid).toBe(true);
  });

  it('should handle edge case at exact limit boundary', () => {
    const existingPlayers = [
      createPlayer(1, 1),
      createPlayer(2, 1),
      createPlayer(3, 1), // 3 from squad 1
    ];

    const newPlayer = createPlayer(4, 1);

    // Max is 3, already at limit
    const result = validateSquadLimit(existingPlayers, newPlayer, 3);

    expect(result.valid).toBe(false);
  });
});
