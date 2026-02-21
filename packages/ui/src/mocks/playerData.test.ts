import { describe, it, expect } from 'vitest';
import {
  squads,
  getSquadById,
  getSquadName,
  getSquadAbbreviation,
  getPlayerProfileImage,
  getPlayerPitchImage,
  getMaxPlayerCost,
  getPositionDisplayName,
  PlayerPosition,
  type Player,
} from './playerData';
import playersData from '@data/trc-2025/players.json';

describe('playerData utilities', () => {
  describe('squad utilities', () => {
    it('should have squads array defined', () => {
      expect(squads).toBeDefined();
      expect(Array.isArray(squads)).toBe(true);
      expect(squads.length).toBeGreaterThan(0);
    });

    it('should have valid squad structure', () => {
      squads.forEach((squad) => {
        expect(squad.id).toBeDefined();
        expect(typeof squad.id).toBe('number');
        expect(squad.name).toBeDefined();
        expect(typeof squad.name).toBe('string');
        expect(squad.abbreviation).toBeDefined();
        expect(typeof squad.abbreviation).toBe('string');
      });
    });
  });

  describe('getSquadById', () => {
    it('should find squad by valid ID', () => {
      const firstSquad = squads[0];
      const result = getSquadById(firstSquad.id);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(firstSquad.id);
      expect(result?.name).toBe(firstSquad.name);
    });

    it('should return undefined for invalid ID', () => {
      const invalidId = 99999;
      const result = getSquadById(invalidId);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for negative ID', () => {
      const result = getSquadById(-1);
      expect(result).toBeUndefined();
    });

    it('should return undefined for zero ID', () => {
      const result = getSquadById(0);
      expect(result).toBeUndefined();
    });
  });

  describe('getSquadName', () => {
    it('should return correct squad name for valid ID', () => {
      const firstSquad = squads[0];
      const name = getSquadName(firstSquad.id);
      
      expect(name).toBe(firstSquad.name);
    });

    it('should return "Unknown" for invalid ID', () => {
      const name = getSquadName(99999);
      expect(name).toBe('Unknown');
    });

    it('should return "Unknown" for negative ID', () => {
      const name = getSquadName(-1);
      expect(name).toBe('Unknown');
    });
  });

  describe('getSquadAbbreviation', () => {
    it('should return correct abbreviation for valid ID', () => {
      const firstSquad = squads[0];
      const abbr = getSquadAbbreviation(firstSquad.id);
      
      expect(abbr).toBe(firstSquad.abbreviation);
    });

    it('should return "N/A" for invalid ID', () => {
      const abbr = getSquadAbbreviation(99999);
      expect(abbr).toBe('N/A');
    });

    it('should return "N/A" for negative ID', () => {
      const abbr = getSquadAbbreviation(-1);
      expect(abbr).toBe('N/A');
    });
  });

  describe('player image utilities', () => {
    const createMockPlayer = (): Player => ({
      id: 123,
      feedId: 456,
      squadId: 1,
      firstName: 'Test',
      lastName: 'Player',
      position: 'center' as any,
      cost: 5000000,
      status: 'available',
      isLocked: false,
      stats: {
        totalPoints: 100,
        avgPoints: 10,
        lastRoundPoints: 12,
        positionRank: 5,
        nextFixture: 3,
        scores: {},
      },
      selected: {
        percentage: 25.5,
      },
      imagePitch: 'pitch/123.jpg',
      imageProfile: 'profile/123.jpg',
    });

    describe('getPlayerProfileImage', () => {
      it('should format profile image path correctly', () => {
        const player = createMockPlayer();
        const path = getPlayerProfileImage(player);
        
        expect(path).toBe('/player-images/portrait/Test-Player-123.jpg');
      });

      it('should handle multi-word first names', () => {
        const player = createMockPlayer();
        player.firstName = 'Jean Pierre';
        const path = getPlayerProfileImage(player);
        
        expect(path).toBe('/player-images/portrait/Jean-Pierre-Player-123.jpg');
      });

      it('should handle multi-word last names', () => {
        const player = createMockPlayer();
        player.lastName = 'van der Berg';
        const path = getPlayerProfileImage(player);
        
        expect(path).toBe('/player-images/portrait/Test-van-der-Berg-123.jpg');
      });

      it('should handle names with extra spaces', () => {
        const player = createMockPlayer();
        player.firstName = 'Test  Name';
        player.lastName = 'Last  Name';
        const path = getPlayerProfileImage(player);
        
        // Should collapse multiple spaces to single hyphen
        expect(path).toContain('Test-Name');
        expect(path).toContain('Last-Name');
      });
    });

    describe('getPlayerPitchImage', () => {
      it('should format pitch image path correctly', () => {
        const player = createMockPlayer();
        const path = getPlayerPitchImage(player);
        
        expect(path).toBe('/player-images/pitch/Test-Player-123.jpg');
      });

      it('should handle special characters in names', () => {
        const player = createMockPlayer();
        player.firstName = "O'Connor";
        const path = getPlayerPitchImage(player);
        
        expect(path).toContain("O'Connor");
      });
    });
  });

  describe('getMaxPlayerCost', () => {
    it('should return a positive number', () => {
      const maxCost = getMaxPlayerCost();
      
      expect(typeof maxCost).toBe('number');
      expect(maxCost).toBeGreaterThan(0);
    });

    it('should return highest cost from players dataset', () => {
      const maxCost = getMaxPlayerCost();
      const players = playersData as Player[];
      const actualMax = Math.max(...players.map((p) => p.cost));
      
      expect(maxCost).toBe(actualMax);
    });

    it('should be greater than or equal to any individual player cost', () => {
      const maxCost = getMaxPlayerCost();
      const players = playersData as Player[];
      
      players.forEach((player) => {
        expect(maxCost).toBeGreaterThanOrEqual(player.cost);
      });
    });
  });

  describe('getPositionDisplayName', () => {
    it('should return correct label for all valid positions', () => {
      const validPositions = Object.values(PlayerPosition);
      
      validPositions.forEach((position) => {
        const label = getPositionDisplayName(position);
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should return formatted labels (not raw enum values)', () => {
      const label = getPositionDisplayName(PlayerPosition.OUTSIDE_BACK);
      
      // Should be "Outside Back" not "outside_back"
      expect(label).toBe('Outside Back');
      expect(label).not.toContain('_');
    });

    it('should return original value for unknown position', () => {
      const unknownPosition = 'unknown_position' as PlayerPosition;
      const label = getPositionDisplayName(unknownPosition);
      
      expect(label).toBe(unknownPosition);
    });

    it('should handle all position types consistently', () => {
      const positions = [
        PlayerPosition.FLY_HALF,
        PlayerPosition.SCRUM_HALF,
        PlayerPosition.HOOKER,
        PlayerPosition.PROP,
        PlayerPosition.LOCK,
        PlayerPosition.LOOSE_FORWARD,
        PlayerPosition.CENTER,
      ];
      
      positions.forEach((position) => {
        const label = getPositionDisplayName(position);
        expect(label).not.toContain('_');
        expect(label[0]).toBe(label[0].toUpperCase()); // Should start with uppercase
      });
    });
  });
});
