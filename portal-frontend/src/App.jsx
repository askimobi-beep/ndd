import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import HomeLogin from './pages/HomeLogin';
import AccountPage from './pages/AccountPage';
import TicketCheckerPage from './pages/TicketCheckerPage';
import LawyerPage from './pages/LawyerPage';
import SupervisorPage from './pages/SupervisorPage';
import AgentPage from './pages/AgentPage';
import MemberPage from './pages/CustomerPage';
import MemberProfilePage from './pages/MemberProfilePage';
import CheckReservationPage from './pages/CheckReservationPage';
import ReservationManagementPage from './pages/ReservationManagementPage';
import PendingApprovalsPage from './pages/PendingApprovalsPage';
import PaymentCheckoutPage from './pages/PaymentCheckoutPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TicketBoardPage from './pages/TicketBoardPage';

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/payment/:token" element={<PaymentCheckoutPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><AccountPage /></AppLayout></ProtectedRoute>} />
        <Route path="/admin-panel" element={<ProtectedRoute><AppLayout><AccountPage /></AppLayout></ProtectedRoute>} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
        <Route path="/ticket-checker" element={<ProtectedRoute allowedRoles={["ADMIN", "TICKET CHECKER"]}><AppLayout><TicketCheckerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/ticket-board" element={<ProtectedRoute allowedRoles={["ADMIN", "TICKET CHECKER"]}><AppLayout><TicketBoardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/lawyers" element={<ProtectedRoute allowedRoles={["ADMIN", "TICKET CHECKER"]}><AppLayout><LawyerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AppLayout><SupervisorPage /></AppLayout></ProtectedRoute>} />
        <Route path="/agents" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]}><AppLayout><AgentPage /></AppLayout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"]}><AppLayout><MemberPage initialQuickFilter="ALL" /></AppLayout></ProtectedRoute>} />
        <Route path="/members/cancelled" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"]}><AppLayout><MemberPage initialQuickFilter="CANCELLED" /></AppLayout></ProtectedRoute>} />
        <Route path="/member-dashboard" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><AppLayout><MemberProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="/member-profile/:id" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"]}><AppLayout><MemberProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="/customers" element={<Navigate to="/members" replace />} />
        <Route path="/check-reservation" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT"]}><AppLayout><CheckReservationPage /></AppLayout></ProtectedRoute>} />
        <Route path="/reservation-management" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT"]}><AppLayout><ReservationManagementPage /></AppLayout></ProtectedRoute>} />
        <Route path="/pending-approvals" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "AGENT"]}><AppLayout><PendingApprovalsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><AppLayout><ChangePasswordPage /></AppLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;