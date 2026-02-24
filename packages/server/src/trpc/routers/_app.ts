import { router } from '../index.js';
import { playersRouter } from './players.js';
import { squadsRouter } from './squads.js';
import { roundsRouter } from './rounds.js';
import { gameweekRouter } from './gameweek.js';
import { leaguesRouter } from './leagues.js';

/**
 * Root tRPC router
 * Combines all feature routers
 */
export const appRouter = router({
  players: playersRouter,
  squads: squadsRouter,
  rounds: roundsRouter,
  gameweek: gameweekRouter,
  leagues: leaguesRouter,
});

export type AppRouter = typeof appRouter;
