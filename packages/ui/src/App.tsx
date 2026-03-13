import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage, MyTeamPage, LeaguesPage, LeagueSettingsPage, LeaguePage } from '@/pages';
import { ProtectedRoute } from '@/components/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - no authentication required */}
        <Route path="/" element={<DashboardPage />} />

        {/* Protected routes - require authentication */}
        <Route
          path="/my-team"
          element={
            <ProtectedRoute>
              <MyTeamPage />
            </ProtectedRoute>
          }
        />

        {/* Leagues — all require authentication */}
        <Route
          path="/leagues"
          element={
            <ProtectedRoute>
              <LeaguesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leagues/:leagueId"
          element={
            <ProtectedRoute>
              <LeaguePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leagues/:leagueId/settings"
          element={
            <ProtectedRoute>
              <LeagueSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
