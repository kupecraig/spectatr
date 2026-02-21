import { describe, it, expect } from 'vitest';
import { playerSchema, playerPositionSchema, squadSchema } from './player.schema';
import { sportSquadConfig } from '../config/sport-squad-config';

describe('playerPositionSchema', () => {
  it('should accept all valid positions from config', () => {
    const validPositions = Object.keys(sportSquadConfig.positions);
    
    validPositions.forEach((position) => {
      const result = playerPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid position strings', () => {
    const invalidPositions = ['invalid_position', 'goalkeeper', '', 'random_text'];
    
    invalidPositions.forEach((position) => {
      const result = playerPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });
  });

  it('should be case-sensitive', () => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    const upperCase = firstPosition.toUpperCase();
    
    // Only fail if the uppercase version is actually different
    if (firstPosition !== upperCase) {
      const result = playerPositionSchema.safeParse(upperCase);
      expect(result.success).toBe(false);
    }
  });

  it('should reject numeric values', () => {
    const result = playerPositionSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it('should reject null and undefined', () => {
    expect(playerPositionSchema.safeParse(null).success).toBe(false);
    expect(playerPositionSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('playerSchema', () => {
  const createValidPlayer = () => {
    const firstPosition = Object.keys(sportSquadConfig.positions)[0];
    return {
      id: 1,
      feedId: 100,
      squadId: 1,
      firstName: 'Test',
      lastName: 'Player',
      position: firstPosition,
      cost: 5000000,
      status: 'available',
      isLocked: false,
      stats: {
        totalPoints: 100,
        avgPoints: 10.5,
        lastRoundPoints: 12,
        positionRank: 5,
        nextFixture: 3,
        scores: {},
      },
      selected: {
        percentage: 25.5,
      },
      imagePitch: 'image/pitch/player.png',
      imageProfile: 'image/profile/player.png',
    };
  };

  describe('valid player parsing', () => {
    it('should parse valid player data', () => {
      const validPlayer = createValidPlayer();
      const result = playerSchema.safeParse(validPlayer);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validPlayer.id);
        expect(result.data.firstName).toBe(validPlayer.firstName);
        expect(result.data.position).toBe(validPlayer.position);
      }
    });

    it('should accept nullable stat values', () => {
      const player = createValidPlayer();
      (player.stats as any) = {
        totalPoints: null,
        avgPoints: null,
        lastRoundPoints: null,
        positionRank: null,
        nextFixture: null,
        scores: {},
      };
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(true);
    });

    it('should accept any value for scores field', () => {
      const player = createValidPlayer();
      player.stats.scores = { match1: 10, match2: 15 };
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(true);
    });

    it('should accept percentage at boundaries', () => {
      const playerMin = createValidPlayer();
      playerMin.selected.percentage = 0;
      
      const playerMax = createValidPlayer();
      playerMax.selected.percentage = 100;
      
      expect(playerSchema.safeParse(playerMin).success).toBe(true);
      expect(playerSchema.safeParse(playerMax).success).toBe(true);
    });

    it('should accept all valid positions from config', () => {
      const positions = Object.keys(sportSquadConfig.positions);
      
      positions.forEach((position) => {
        const player = createValidPlayer();
        player.position = position;
        
        const result = playerSchema.safeParse(player);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid player data', () => {
    it('should reject player with missing required fields', () => {
      const invalidPlayer = {
        id: 1,
        firstName: 'Test',
        // Missing lastName, position, cost, etc.
      };
      
      const result = playerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });

    it('should reject player with wrong field types', () => {
      const player = createValidPlayer();
      (player as any).id = 'not-a-number';
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject negative or zero cost', () => {
      const playerZero = createValidPlayer();
      playerZero.cost = 0;
      
      const playerNegative = createValidPlayer();
      playerNegative.cost = -1000;
      
      expect(playerSchema.safeParse(playerZero).success).toBe(false);
      expect(playerSchema.safeParse(playerNegative).success).toBe(false);
    });

    it('should reject invalid position', () => {
      const player = createValidPlayer();
      (player as any).position = 'invalid_position';
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject percentage out of range', () => {
      const playerUnder = createValidPlayer();
      playerUnder.selected.percentage = -1;
      
      const playerOver = createValidPlayer();
      playerOver.selected.percentage = 101;
      
      expect(playerSchema.safeParse(playerUnder).success).toBe(false);
      expect(playerSchema.safeParse(playerOver).success).toBe(false);
    });

    it('should reject missing stats object', () => {
      const player = createValidPlayer();
      (player as any).stats = undefined;
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject missing selected object', () => {
      const player = createValidPlayer();
      (player as any).selected = undefined;
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject wrong boolean type for isLocked', () => {
      const player = createValidPlayer();
      (player as any).isLocked = 'true';
      
      const result = playerSchema.safeParse(player);
      expect(result.success).toBe(false);
    });
  });
});

describe('squadSchema', () => {
  const createValidPlayer = (id: number) => {
    const positions = Object.keys(sportSquadConfig.positions);
    const position = positions[id % positions.length];
    
    return {
      id,
      feedId: 100 + id,
      squadId: 1,
      firstName: `Player${id}`,
      lastName: `Test${id}`,
      position,
      cost: 2000000,
      status: 'available',
      isLocked: false,
      stats: {
        totalPoints: 50,
        avgPoints: 5,
        lastRoundPoints: 8,
        positionRank: 10,
        nextFixture: 2,
        scores: {},
      },
      selected: {
        percentage: 15.5,
      },
      imagePitch: `image/pitch/${id}.png`,
      imageProfile: `image/profile/${id}.png`,
    };
  };

  it('should parse valid squad with players array', () => {
    const maxPlayers = sportSquadConfig.maxPlayers;
    const players = Array.from({ length: maxPlayers }, (_, i) => createValidPlayer(i + 1));
    const totalCost = players.reduce((sum, p) => sum + p.cost, 0);
    
    const squad = { players, totalCost };
    const result = squadSchema.safeParse(squad);
    
    expect(result.success).toBe(true);
  });

  it('should reject squad exceeding max players', () => {
    const maxPlayers = sportSquadConfig.maxPlayers;
    const players = Array.from({ length: maxPlayers + 1 }, (_, i) => createValidPlayer(i + 1));
    const totalCost = players.reduce((sum, p) => sum + p.cost, 0);
    
    const squad = { players, totalCost };
    const result = squadSchema.safeParse(squad);
    
    expect(result.success).toBe(false);
  });

  it('should accept squad under max players', () => {
    const maxPlayers = sportSquadConfig.maxPlayers;
    const players = Array.from({ length: Math.max(1, maxPlayers - 1) }, (_, i) => createValidPlayer(i + 1));
    const totalCost = players.reduce((sum, p) => sum + p.cost, 0);
    
    const squad = { players, totalCost };
    const result = squadSchema.safeParse(squad);
    
    expect(result.success).toBe(true);
  });

  it('should reject squad with totalCost over budget cap', () => {
    const players = [createValidPlayer(1)];
    const squad = {
      players,
      totalCost: 43_000_000, // Over 42M cap
    };
    
    const result = squadSchema.safeParse(squad);
    expect(result.success).toBe(false);
  });

  it('should accept empty squad array', () => {
    const squad = {
      players: [],
      totalCost: 0,
    };
    
    const result = squadSchema.safeParse(squad);
    expect(result.success).toBe(true);
  });

  it('should reject squad with invalid player in array', () => {
    const validPlayer = createValidPlayer(1);
    const invalidPlayer = { ...createValidPlayer(2), cost: -1000 }; // Invalid cost
    
    const squad = {
      players: [validPlayer, invalidPlayer],
      totalCost: validPlayer.cost + invalidPlayer.cost,
    };
    
    const result = squadSchema.safeParse(squad);
    expect(result.success).toBe(false);
  });

  it('should accept zero or positive totalCost', () => {
    const squadZero = {
      players: [],
      totalCost: 0,
    };
    
    const squadPositive = {
      players: [],
      totalCost: 1000000,
    };
    
    expect(squadSchema.safeParse(squadZero).success).toBe(true);
    expect(squadSchema.safeParse(squadPositive).success).toBe(true);
  });
});
