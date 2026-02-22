import squadsData from '@data/trc-2025/squads.json';
import playersData from '@data/trc-2025/players.json';
import leaguesData from './leagues.json';
import leagueRulesData from './leagueRules.json';
// Note: SportSquadConfig and validation now in @spectatr/shared-types

export interface PlayerSquad {
    id: number;
    name: string;
    abbreviation: string;
    badge: string | null;
    backgroundColor: string;
}

export const squads: PlayerSquad[] = squadsData;

/**
 * @deprecated Uses hardcoded trc-2025 squads. Use `useSquadsQuery()` from
 * `@/hooks/api` to fetch squads for the active tenant at runtime.
 */
export function getSquadById(squadId: number): PlayerSquad | undefined {
    return squads.find(squad => squad.id === squadId);
}

/**
 * @deprecated Uses hardcoded trc-2025 squads. Use `useSquadsQuery()` from
 * `@/hooks/api` to fetch squads for the active tenant at runtime.
 */
export function getSquadName(squadId: number): string {
    return getSquadById(squadId)?.name || 'Unknown';
}

/**
 * @deprecated Uses hardcoded trc-2025 squads. Use `useSquadsQuery()` from
 * `@/hooks/api` to fetch squads for the active tenant at runtime.
 */
export function getSquadAbbreviation(squadId: number): string {
    return getSquadById(squadId)?.abbreviation || 'N/A';
}

// Image path helpers - images are served from the public folder
// Images use format: {FirstName-LastName-id}.jpg
function getPlayerImageFilename(player: Player): string {
    const firstName = player.firstName.replace(/\s+/g, '-');
    const lastName = player.lastName.replace(/\s+/g, '-');
    return `${firstName}-${lastName}-${player.id}.jpg`;
}

export function getPlayerProfileImage(player: Player): string {
    return `/player-images/portrait/${getPlayerImageFilename(player)}`;
}

export function getPlayerPitchImage(player: Player): string {
    return `/player-images/pitch/${getPlayerImageFilename(player)}`;
}

export function getPlayerProfileImageUrl(imagePath: string): string {
    return `/player-images/${imagePath}`;
}

export function getPlayerPitchImageUrl(imagePath: string): string {
    return `/player-images/${imagePath}`;
}

export function getMaxPlayerCost(): number {
    const players = playersData as Player[];
    return Math.max(...players.map((p) => p.cost));
}

export const STATUS_COLOR_VAR: Record<string, string> = {
    selected: 'var(--color-status-selected)',
    injured: 'var(--color-status-injured)',
    benched: 'var(--color-status-benched)',
    eliminated: 'var(--color-status-eliminated)',
};

// Instance-specific position configuration for Rugby Union
// For other sport instances, define separate position enums (e.g., SoccerPosition, CricketPosition)
export enum PlayerPosition {
    OUTSIDE_BACK = 'outside_back',
    FLY_HALF = 'fly_half',
    SCRUM_HALF = 'scrum_half',
    HOOKER = 'hooker',
    PROP = 'prop',
    LOCK = 'lock',
    LOOSE_FORWARD = 'loose_forward',
    CENTER = 'center',
}

export const POSITION_LABELS: Record<PlayerPosition, string> = {
    [PlayerPosition.OUTSIDE_BACK]: 'Outside Back',
    [PlayerPosition.FLY_HALF]: 'Fly Half',
    [PlayerPosition.SCRUM_HALF]: 'Scrum Half',
    [PlayerPosition.HOOKER]: 'Hooker',
    [PlayerPosition.PROP]: 'Prop',
    [PlayerPosition.LOCK]: 'Lock',
    [PlayerPosition.LOOSE_FORWARD]: 'Loose Forward',
    [PlayerPosition.CENTER]: 'Center',
};

export function getPositionDisplayName(position:PlayerPosition): string {
    return POSITION_LABELS[position as PlayerPosition] || position;
}

// Position group name to PlayerPosition enum mapping
// Used for UI grouping (e.g., "Back Three" instead of individual positions)
export const POSITION_GROUP_MAPPING: Record<string, PlayerPosition> = {
    'Back Three': PlayerPosition.OUTSIDE_BACK,
    'Centre': PlayerPosition.CENTER,
    'Fly-half': PlayerPosition.FLY_HALF,
    'Scrum-half': PlayerPosition.SCRUM_HALF,
    'Back-row': PlayerPosition.LOOSE_FORWARD,
    'Lock': PlayerPosition.LOCK,
    'Prop': PlayerPosition.PROP,
    'Hooker': PlayerPosition.HOOKER,
};

// Position interface for rugby formation layout
export interface Position {
    readonly id: number;
    readonly position: PlayerPosition;
    readonly label: string;
    readonly row: number;
    readonly index: number;
    readonly x: number;
    readonly y: number;
}

export enum PlayerStatus {
    SELECTED = 'selected',
    INJURED = 'injured',
    NOTSELECTED = 'not-selected',
    ELIMINATED = 'eliminated',
    BENCHED = 'benched',
}

export interface PlayerStats {
    totalPoints: number | null;
    avgPoints: number | null;
    lastRoundPoints: number | null;
    positionRank: number | null;
    nextFixture: number | null;
    scores: any; // Adjust type if you know the structure
}

export interface PlayerSelected {
    [key: string]: number;
}

export interface Player {
    id: number;
    feedId: number;
    squadId: number; // the players team
    firstName: string;
    lastName: string;
    position: PlayerPosition; // Instance-specific: rugby positions for this instance
    cost: number;
    status: string;
    isLocked: boolean;
    stats: PlayerStats;
    selected: PlayerSelected;
    imagePitch: string;
    imageProfile: string;
}

// League interfaces
export interface League {
    id: number;
    name: string;
    description: string;
    creatorId: number;
    isPublic: boolean;
    status: 'active' | 'completed' | 'pending';
    participantCount: number;
    createdAt: string;
}

export interface DraftSettings {
    draftType: 'snake' | 'linear';
    pickTimeLimit: number; // seconds
    draftOrder: 'random' | 'ranked';
    scheduledDate: string;
}

export interface LeagueRules {
    id: number;
    leagueId: number;
    name: string;
    draftMode: boolean;
    pricingModel: 'fixed' | 'dynamic';
    priceCapEnabled: boolean;
    priceCap: number | null;
    positionMatching: boolean;
    squadLimitPerTeam: number | null;
    sharedPool: boolean;
    transfersPerRound: number;
    wildcardRounds: number[];
    tripleCaptainRounds: number[];
    benchBoostRounds: number[];
    draftSettings?: DraftSettings;
    createdAt: string;
    updatedAt: string;
}

// League data exports
export const leagues: League[] = leaguesData as League[];
export const leagueRules: LeagueRules[] = leagueRulesData as LeagueRules[];

export function getLeagueById(leagueId: number): League | undefined {
    return leagues.find(league => league.id === leagueId);
}

export function getLeagueRulesByLeagueId(leagueId: number): LeagueRules | undefined {
    return leagueRules.find(rules => rules.leagueId === leagueId);
}

export function getActiveLeagues(): League[] {
    return leagues.filter(league => league.status === 'active');
}

export function getPublicLeagues(): League[] {
    return leagues.filter(league => league.isPublic);
}

// Sport squad configuration and validation now in @spectatr/shared-types
// Import with: import { validateSquad, rugbySquadConfig } from '@spectatr/shared-types';