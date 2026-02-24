import { create } from 'zustand';
import type { CreateLeagueInput } from '@spectatr/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LeagueDialogMode = 'create' | 'join' | 'edit' | null;

export interface LeagueFormDraft {
  name: string;
  gameMode: 'standard' | 'round-robin' | 'ranked';
  isPublic: boolean;
  maxParticipants: number;
  rules: Partial<CreateLeagueInput['rules']>;
}

export interface LeagueState {
  // ── Dialog / modal state ──────────────────────────────────────────────────
  /** Which dialog is open, or null if all are closed */
  dialogMode: LeagueDialogMode;

  /** ID of the league being edited (for 'edit' mode) */
  editingLeagueId: number | null;

  // ── Create / edit form draft ──────────────────────────────────────────────
  /** In-progress form data; cleared on cancel/success */
  formDraft: LeagueFormDraft;

  // ── Join flow ─────────────────────────────────────────────────────────────
  /** Invite code entered by the user in the join dialog */
  joinInviteCode: string;

  /** Team name entered in the join dialog */
  joinTeamName: string;

  // ── List UI ───────────────────────────────────────────────────────────────
  /** Filter for the public league browser */
  browseGameMode: 'standard' | 'round-robin' | 'ranked' | null;

  /** Which league's details panel is expanded in the list */
  expandedLeagueId: number | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Open create dialog, optionally pre-seeding the form */
  openCreateDialog: (draft?: Partial<LeagueFormDraft>) => void;

  /** Open join dialog, optionally pre-filling the invite code */
  openJoinDialog: (inviteCode?: string) => void;

  /** Open edit dialog for an existing league */
  openEditDialog: (leagueId: number, draft: LeagueFormDraft) => void;

  /** Close any open dialog and clear transient state */
  closeDialog: () => void;

  /** Update fields in the form draft (partial merge) */
  setFormDraft: (patch: Partial<LeagueFormDraft>) => void;

  /** Update join flow inputs */
  setJoinInviteCode: (code: string) => void;
  setJoinTeamName: (name: string) => void;

  /** Toggle browse game-mode filter (null = show all) */
  setBrowseGameMode: (mode: 'standard' | 'round-robin' | 'ranked' | null) => void;

  /** Expand/collapse a league details panel in the list */
  setExpandedLeague: (id: number | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const defaultFormDraft: LeagueFormDraft = {
  name: '',
  gameMode: 'standard',
  isPublic: false,
  maxParticipants: 10,
  rules: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zustand store for league management UI state.
 *
 * Covers:
 *  - Create / join / edit dialog open state
 *  - In-progress form data (not persisted to server until mutation fires)
 *  - Public league browser filters
 *
 * Server state (list, details, standings) lives in TanStack Query via
 * `useLeaguesQuery`.
 */
export const useLeagueStore = create<LeagueState>((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  dialogMode: null,
  editingLeagueId: null,
  formDraft: { ...defaultFormDraft },
  joinInviteCode: '',
  joinTeamName: '',
  browseGameMode: null,
  expandedLeagueId: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  openCreateDialog: (draft) =>
    set({
      dialogMode: 'create',
      editingLeagueId: null,
      formDraft: { ...defaultFormDraft, ...draft },
    }),

  openJoinDialog: (inviteCode = '') =>
    set({
      dialogMode: 'join',
      joinInviteCode: inviteCode,
      joinTeamName: '',
    }),

  openEditDialog: (leagueId, draft) =>
    set({
      dialogMode: 'edit',
      editingLeagueId: leagueId,
      formDraft: { ...draft },
    }),

  closeDialog: () =>
    set({
      dialogMode: null,
      editingLeagueId: null,
      formDraft: { ...defaultFormDraft },
      joinInviteCode: '',
      joinTeamName: '',
    }),

  setFormDraft: (patch) =>
    set((state) => ({ formDraft: { ...state.formDraft, ...patch } })),

  setJoinInviteCode: (code) => set({ joinInviteCode: code }),
  setJoinTeamName: (name) => set({ joinTeamName: name }),

  setBrowseGameMode: (mode) => set({ browseGameMode: mode }),

  setExpandedLeague: (id) => set({ expandedLeagueId: id }),
}));
