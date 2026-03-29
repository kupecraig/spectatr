import { describe, it, expect, beforeEach } from 'vitest';
import { useLeagueStore, type LeagueFormDraft } from './leagueStore';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const blankDraft: LeagueFormDraft = {
  name: '',
  teamName: '',
  format: 'classic',
  gameMode: 'standard',
  isPublic: false,
  maxParticipants: 10,
  rules: {},
};

function resetStore() {
  useLeagueStore.setState({
    dialogMode: null,
    editingLeagueId: null,
    formDraft: { ...blankDraft },
    joinInviteCode: '',
    joinTeamName: '',
    browseGameMode: null,
    expandedLeagueId: null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useLeagueStore', () => {
  beforeEach(resetStore);

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has no dialog open', () => {
      expect(useLeagueStore.getState().dialogMode).toBeNull();
    });

    it('has no editing league id', () => {
      expect(useLeagueStore.getState().editingLeagueId).toBeNull();
    });

    it('has blank form draft', () => {
      expect(useLeagueStore.getState().formDraft).toEqual(blankDraft);
    });

    it('has no browse game mode filter', () => {
      expect(useLeagueStore.getState().browseGameMode).toBeNull();
    });

    it('has no expanded league', () => {
      expect(useLeagueStore.getState().expandedLeagueId).toBeNull();
    });
  });

  // ── Create dialog ──────────────────────────────────────────────────────────

  describe('openCreateDialog', () => {
    it('sets dialogMode to create', () => {
      useLeagueStore.getState().openCreateDialog();
      expect(useLeagueStore.getState().dialogMode).toBe('create');
    });

    it('uses default form draft when called with no args', () => {
      useLeagueStore.getState().openCreateDialog();
      expect(useLeagueStore.getState().formDraft).toEqual(blankDraft);
    });

    it('pre-seeds the form draft when a partial draft is provided', () => {
      useLeagueStore.getState().openCreateDialog({ name: 'Office League', teamName: 'The Reds' });
      const { formDraft } = useLeagueStore.getState();
      expect(formDraft.name).toBe('Office League');
      expect(formDraft.teamName).toBe('The Reds');
      // Unspecified fields keep their defaults
      expect(formDraft.gameMode).toBe('standard');
      expect(formDraft.maxParticipants).toBe(10);
    });

    it('clears editingLeagueId', () => {
      useLeagueStore.setState({ editingLeagueId: 99 });
      useLeagueStore.getState().openCreateDialog();
      expect(useLeagueStore.getState().editingLeagueId).toBeNull();
    });
  });

  // ── Join dialog ────────────────────────────────────────────────────────────

  describe('openJoinDialog', () => {
    it('sets dialogMode to join', () => {
      useLeagueStore.getState().openJoinDialog();
      expect(useLeagueStore.getState().dialogMode).toBe('join');
    });

    it('defaults joinInviteCode to empty string', () => {
      useLeagueStore.getState().openJoinDialog();
      expect(useLeagueStore.getState().joinInviteCode).toBe('');
    });

    it('pre-fills the invite code when provided', () => {
      useLeagueStore.getState().openJoinDialog('ABCD1234');
      expect(useLeagueStore.getState().joinInviteCode).toBe('ABCD1234');
    });

    it('always resets joinTeamName to empty', () => {
      useLeagueStore.setState({ joinTeamName: 'Leftover Team' });
      useLeagueStore.getState().openJoinDialog('XYZW5678');
      expect(useLeagueStore.getState().joinTeamName).toBe('');
    });
  });

  // ── Edit dialog ────────────────────────────────────────────────────────────

  describe('openEditDialog', () => {
    it('sets dialogMode to edit', () => {
      useLeagueStore.getState().openEditDialog(1, { ...blankDraft });
      expect(useLeagueStore.getState().dialogMode).toBe('edit');
    });

    it('sets editingLeagueId', () => {
      useLeagueStore.getState().openEditDialog(42, { ...blankDraft });
      expect(useLeagueStore.getState().editingLeagueId).toBe(42);
    });

    it('populates formDraft from the provided draft', () => {
      const draft: LeagueFormDraft = { ...blankDraft, name: 'Edit Me', maxParticipants: 20 };
      useLeagueStore.getState().openEditDialog(5, draft);
      const { formDraft } = useLeagueStore.getState();
      expect(formDraft.name).toBe('Edit Me');
      expect(formDraft.maxParticipants).toBe(20);
    });
  });

  // ── Close dialog ───────────────────────────────────────────────────────────

  describe('closeDialog', () => {
    it('sets dialogMode to null', () => {
      useLeagueStore.getState().openCreateDialog();
      useLeagueStore.getState().closeDialog();
      expect(useLeagueStore.getState().dialogMode).toBeNull();
    });

    it('clears editingLeagueId', () => {
      useLeagueStore.getState().openEditDialog(7, { ...blankDraft });
      useLeagueStore.getState().closeDialog();
      expect(useLeagueStore.getState().editingLeagueId).toBeNull();
    });

    it('resets formDraft to defaults', () => {
      useLeagueStore.getState().openCreateDialog({ name: 'Test League', teamName: 'My Team' });
      useLeagueStore.getState().closeDialog();
      expect(useLeagueStore.getState().formDraft).toEqual(blankDraft);
    });

    it('clears join flow inputs', () => {
      useLeagueStore.getState().openJoinDialog('CODE1234');
      useLeagueStore.setState({ joinTeamName: 'Team Bravo' });
      useLeagueStore.getState().closeDialog();
      expect(useLeagueStore.getState().joinInviteCode).toBe('');
      expect(useLeagueStore.getState().joinTeamName).toBe('');
    });
  });

  // ── Form draft ─────────────────────────────────────────────────────────────

  describe('setFormDraft', () => {
    it('merges the patch into the existing draft', () => {
      useLeagueStore.getState().openCreateDialog({ name: 'Original', maxParticipants: 10 });
      useLeagueStore.getState().setFormDraft({ name: 'Updated' });
      const { formDraft } = useLeagueStore.getState();
      expect(formDraft.name).toBe('Updated');
      expect(formDraft.maxParticipants).toBe(10); // unchanged
    });

    it('can update multiple fields at once', () => {
      useLeagueStore.getState().setFormDraft({ name: 'Two', isPublic: true });
      const { formDraft } = useLeagueStore.getState();
      expect(formDraft.name).toBe('Two');
      expect(formDraft.isPublic).toBe(true);
    });
  });

  describe('setJoinInviteCode', () => {
    it('updates the invite code', () => {
      useLeagueStore.getState().setJoinInviteCode('NEW12345');
      expect(useLeagueStore.getState().joinInviteCode).toBe('NEW12345');
    });
  });

  describe('setJoinTeamName', () => {
    it('updates the team name', () => {
      useLeagueStore.getState().setJoinTeamName('The Highlanders');
      expect(useLeagueStore.getState().joinTeamName).toBe('The Highlanders');
    });
  });

  // ── Browse game mode filter ────────────────────────────────────────────────

  describe('setBrowseGameMode', () => {
    it('sets the filter to a specific mode', () => {
      useLeagueStore.getState().setBrowseGameMode('ranked');
      expect(useLeagueStore.getState().browseGameMode).toBe('ranked');
    });

    it('clears the filter when set to null', () => {
      useLeagueStore.getState().setBrowseGameMode('standard');
      useLeagueStore.getState().setBrowseGameMode(null);
      expect(useLeagueStore.getState().browseGameMode).toBeNull();
    });

    it('can cycle through all game modes', () => {
      const modes = ['standard', 'round-robin', 'ranked'] as const;
      for (const mode of modes) {
        useLeagueStore.getState().setBrowseGameMode(mode);
        expect(useLeagueStore.getState().browseGameMode).toBe(mode);
      }
    });
  });

  // ── Expanded league panel ──────────────────────────────────────────────────

  describe('setExpandedLeague', () => {
    it('sets the expanded league ID', () => {
      useLeagueStore.getState().setExpandedLeague(12);
      expect(useLeagueStore.getState().expandedLeagueId).toBe(12);
    });

    it('collapses when set to null', () => {
      useLeagueStore.getState().setExpandedLeague(12);
      useLeagueStore.getState().setExpandedLeague(null);
      expect(useLeagueStore.getState().expandedLeagueId).toBeNull();
    });

    it('replaces the previous expanded ID', () => {
      useLeagueStore.getState().setExpandedLeague(3);
      useLeagueStore.getState().setExpandedLeague(7);
      expect(useLeagueStore.getState().expandedLeagueId).toBe(7);
    });
  });
});
