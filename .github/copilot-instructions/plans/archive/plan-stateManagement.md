## Plan: State Management for Spectatr

For this complex fantasy sports platform with live scoring, draft systems, and business logic, **TanStack Query + Zustand** is the clear winner. This combination separates server state (auth, players, leagues, real-time scores) from client state (UI, squad building, rules engine).

### Steps
1. Install `@tanstack/react-query` and `zustand` for complementary state handling
2. Use **TanStack Query** for all server operations: authentication, player data with caching, live score updates, draft WebSocket integration
3. Use **Zustand** for client-only concerns: UI state (drawer/modals), local squad composition before save, business logic (rules engine, price cap validation, scoring calculations)
4. Integrate React Hook Form for complex forms (team management, league settings) paired with TanStack Query mutations

### Further Considerations
1. **Alternative: Redux Toolkit + RTK Query?** More comprehensive but heavier boilerplate. Choose if you need time-travel debugging or have Redux experience. Best for teams already invested in Redux ecosystem.
2. **Real-time strategy**: TanStack Query supports WebSocket subscriptions natively. Plan polling intervals for live scores (30s) and WebSocket for draft coordination.
3. **Rules engine design**: Implement scoring/validation logic as pure functions in Zustand stores for easy unit testing independent of React components.
