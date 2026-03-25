import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  UserIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { clearAuthSession, formatRoleLabel, getAuthUser, hasAnyRole } from "../utils/auth";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const navigate = useNavigate();
  const user = getAuthUser();
  const displayName = user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Admin User";
  const displayRole = formatRoleLabel(user?.role);
  const canViewTicketMakerPage = hasAnyRole(user?.role, ["ADMIN", "TICKET CHECKER"]);
  const canViewLawyerPage = hasAnyRole(user?.role, ["ADMIN", "TICKET CHECKER"]);
  const canViewSupervisorPage = hasAnyRole(user?.role, ["ADMIN"]);
  const canViewAgentPage = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR"]);
  const canViewCustomerPage = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canViewPendingApprovalsPage = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canManageUsers = canViewTicketMakerPage || canViewLawyerPage || canViewSupervisorPage || canViewAgentPage || canViewCustomerPage || canViewPendingApprovalsPage;
  const linkBaseClass = "flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 cursor-pointer";
  const linkActiveClass = "bg-gradient-to-r from-secondary to-primary shadow-md";
  const linkIdleClass = "hover:bg-secondary/70";

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={`bg-primary text-white h-screen flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
        open ? "w-64" : "w-20"
      }`}
    >
      {/* Logo */}
      <div className="border-b border-white/20 bg-primary px-3 py-3">
        <div className={`flex items-center rounded-xl bg-primary/90 px-2 py-2 ${open ? "gap-3" : "justify-center"}`}>
          <img
            src={`${process.env.PUBLIC_URL}/favicon-ndd.png`}
            alt="NDD Logo"
            className="h-9 w-9 flex-shrink-0 rounded-lg object-contain"
          />
          {open && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
              Portal Access
            </p>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 mt-4 px-3 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkIdleClass}`}
        >
          <UserIcon className="h-6 w-6" />
          {open && <span>Profile</span>}
        </NavLink>

        {canManageUsers && (
          <div>
            <div
              onClick={() => setDashboardOpen(!dashboardOpen)}
              className={`${linkBaseClass} ${dashboardOpen ? linkActiveClass : linkIdleClass} justify-between`}
            >
              <div className="flex items-center gap-4">
                <Squares2X2Icon className="h-6 w-6" />
                {open && <span>Dashboard</span>}
              </div>

              {open && (
                <ChevronDownIcon
                  className={`h-4 transition ${
                    dashboardOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>

            {/* Sub Menu */}
            {dashboardOpen && open && (
              <div className="ml-12 flex flex-col gap-1 py-2 text-sm">
                {canViewTicketMakerPage && (
                  <NavLink
                    to="/ticket-checker"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Ticket Checker
                  </NavLink>
                )}
                {canViewLawyerPage && (
                  <NavLink
                    to="/lawyers"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Lawyers
                  </NavLink>
                )}
                {canViewSupervisorPage && (
                  <NavLink
                    to="/supervisor"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Supervisor
                  </NavLink>
                )}
                {canViewAgentPage && (
                  <NavLink
                    to="/agents"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Agents
                  </NavLink>
                )}
                {canViewCustomerPage && (
                  <NavLink
                    to="/customers"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Customers
                  </NavLink>
                )}
                {canViewPendingApprovalsPage && (
                  <NavLink
                    to="/pending-approvals"
                    className={({ isActive }) => `px-3 py-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-secondary/80 shadow-sm' : 'hover:bg-secondary/60'}`}
                  >
                    Pending Approvals
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`${linkBaseClass} ${linkIdleClass} w-full`}
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6" />
          {open && <span>Logout</span>}
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-secondary/60 p-4 flex items-center gap-3">
        <img
          src={`${process.env.PUBLIC_URL}/avatar.jpg`}
          alt="User avatar"
          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
        />
        {open && (
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-gray-300">{displayRole}</p>
          </div>
        )}
      </div>
    </div>
  );
}