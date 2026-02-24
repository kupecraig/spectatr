import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage, MyTeamPage, LeaguesPage } from '@/pages';
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

        {/* Leagues — browse is public, create/join requires auth */}
        <Route path="/leagues" element={<LeaguesPage />} />
        <Route
          path="/leagues/:leagueId"
          element={
            <ProtectedRoute>
              <LeaguesPage />
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
