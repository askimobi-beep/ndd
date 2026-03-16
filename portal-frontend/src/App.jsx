import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import HomeLogin from './pages/HomeLogin';
import SignUpPage from './pages/SignUp';
import AccountPage from './pages/AccountPage';
import TicketCheckerPage from './pages/TicketCheckerPage';
import SupervisorPage from './pages/SupervisorPage';
import AgentPage from './pages/AgentPage';
import CustomerPage from './pages/CustomerPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function AppLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 bg-accent overflow-auto">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeLogin />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><AccountPage /></AppLayout></ProtectedRoute>} />
        <Route path="/admin-panel" element={<ProtectedRoute><AppLayout><AccountPage /></AppLayout></ProtectedRoute>} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
        <Route path="/ticket-checker" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AppLayout><TicketCheckerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AppLayout><SupervisorPage /></AppLayout></ProtectedRoute>} />
        <Route path="/agents" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]}><AppLayout><AgentPage /></AppLayout></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT"]}><AppLayout><CustomerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><AppLayout><ChangePasswordPage /></AppLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;