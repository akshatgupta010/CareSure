import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './context/ThemeContext';
import { DemoModeProvider } from './context/DemoModeContext';
import { AuthProvider } from './context/AuthContext';

import { RequireAuth } from './components/layout/RequireAuth';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './features/auth/LoginPage';
import { OverviewPage } from './features/dashboard/OverviewPage';
import { ClaimsListPage } from './features/claims/ClaimsListPage';
import { NewClaimWizard } from './features/claims/wizard/NewClaimWizard';
import { ClaimDetailPage } from './features/claims/ClaimDetailPage';
import { VerificationWorkspace } from './features/verification/VerificationWorkspace';
import { ReviewQueuePage } from './features/review/ReviewQueuePage';
import { RevenueLeakagePage } from './features/leakage/RevenueLeakagePage';
import { PatientsPage } from './features/patients/PatientsPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { AuditTrailPage } from './features/audit/AuditTrailPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { SettingsPage } from './features/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DemoModeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Application Workspace */}
                <Route
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<OverviewPage />} />
                  <Route path="/claims" element={<ClaimsListPage />} />
                  <Route path="/claims/new" element={<NewClaimWizard />} />
                  <Route path="/claims/:id" element={<ClaimDetailPage />} />
                  <Route path="/verification" element={<VerificationWorkspace />} />
                  <Route path="/review" element={<ReviewQueuePage />} />
                  <Route path="/revenue-leakage" element={<RevenueLeakagePage />} />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/audit-trail" element={<AuditTrailPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </DemoModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
