import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGate, AppLayout } from './components/layout/AppLayout'
import Auth           from './pages/Auth'
import Overview       from './pages/Overview'
import MonthlyBreakdown from './pages/MonthlyBreakdown'
import QuickAdd       from './pages/QuickAdd'
import PropertyDetails from './pages/PropertyDetails'
import IntelligenceDeepDive from './pages/IntelligenceDeepDive'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AuthGate><AppLayout /></AuthGate>}>
              <Route index element={<Overview />} />
              <Route path="monthly"  element={<MonthlyBreakdown />} />
              <Route path="add"      element={<QuickAdd />} />
              <Route path="property" element={<PropertyDetails />} />
              <Route path="intelligence/:metric" element={<IntelligenceDeepDive />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
