// ADMIN-LAYOUT-OUTLET-FIX-1774275001
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/App";
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Tags,
  Settings,
  MessageSquare,
  Boxes,
  User,
  LogOut,
  Menu,
  ChevronDown,
  Home,
  FileText,
  Users,
  ShieldCheck,
  ClipboardList,
  Building2,
  Layers,
  BookMarked,
  Wrench,
  GitBranch,
  ShoppingBag,
  BarChart2,
  FileSpreadsheet,
  Warehouse,
  Activity,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Thin label that separates nav groups */
function NavGroup({ label }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[10px] uppercase tracking-widest text-[#FFFFF0]/30 font-semibold">
        {label}
      </p>
    </div>
  );
}

/** Single nav link */
function NavLink({ to, icon: Icon, label, onClick, exact = false }) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && to !== "/admin"
      ? true
      : location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`flex items-center gap-3 px-4 py-2.5 rounded transition-colors ${
        isActive
          ? "bg-[#DACBA0]/20 text-[#DACBA0]"
          : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
      }`}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

/** Collapsible accordion nav section */
function NavAccordion({ icon: Icon, label, open, onToggle, children, matchPaths = [] }) {
  const location = useLocation();
  const isActive = matchPaths.some(p => location.pathname.startsWith(p));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-4 py-2.5 rounded transition-colors ${
          isActive || open
            ? "bg-[#DACBA0]/20 text-[#DACBA0]"
            : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4" />}
          <span className="text-sm">{label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const auth = useAuth?.() || {};
  const user = auth.user || null;
  const logout = auth.logout || (() => {});
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  // Accordion open states
  const [pagesOpen, setPagesOpen] = useState(
    location.pathname.startsWith("/admin/pages")
  );
  const [teamOpen, setTeamOpen] = useState(
    location.pathname.startsWith("/admin/users") ||
    location.pathname.startsWith("/admin/roles") ||
    location.pathname.startsWith("/admin/activity-logs")
  );
  const [profileOpen, setProfileOpen] = useState(
    location.pathname.startsWith("/admin/profile") ||
    location.pathname === "/admin/2fa-setup" ||
    location.pathname === "/admin/change-password" ||
    location.pathname === "/admin/account-settings"
  );

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const handleLogout = () => {
    try { logout(); } catch (e) { console.error("Logout failed:", e); }
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex">

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1B4D3E] transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="p-6 border-b border-[#FFFFF0]/10">
            <Link to="/admin">
              <img
                src="/assets/logo-gold.png"
                alt="Chytare Admin"
                className="h-10 brightness-110"
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
              <div className="text-[#DACBA0] text-lg font-semibold mt-2">Chytare Admin</div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 overflow-y-auto text-[#FFFFF0] space-y-0.5">

            {/* Dashboard — always top, ungrouped */}
            <NavLink to="/admin" icon={LayoutDashboard} label="Dashboard" onClick={close} exact />

            {/* ── WEBSITE ────────────────────────────────────── */}
            <NavGroup label="Website" />
            {isAdmin && (
              <NavLink to="/admin/settings" icon={Home} label="Homepage CMS" onClick={close} />
            )}
            <NavLink to="/admin/stories" icon={BookOpen} label="Stories" onClick={close} />
            <NavLink to="/admin/categories" icon={Tags} label="Categories" onClick={close} />

            {/* Pages accordion — stays in Website group */}
            <NavAccordion
              icon={FileText}
              label="Pages"
              open={pagesOpen}
              onToggle={() => setPagesOpen(p => !p)}
              matchPaths={["/admin/pages"]}
            >
              <NavLink to="/admin/pages/about" label="About Page" onClick={close} />
            </NavAccordion>

            {isAdmin && (
              <NavLink to="/admin/settings?tab=site" icon={Settings} label="Site Settings" onClick={close} />
            )}

            {/* ── CATALOG & SALES ───────────────────────────── */}
            <NavGroup label="Catalog & Sales" />
            <NavLink to="/admin/products" icon={Package} label="Products" onClick={close} />
            <NavLink to="/admin/product-master" icon={BookMarked} label="Product Master" onClick={close} />
            <NavLink to="/admin/enquiries" icon={MessageSquare} label="Enquiries" onClick={close} />
            <NavLink to="/admin/orders" icon={ShoppingBag} label="Orders" onClick={close} />

            {/* ── PRODUCTION ────────────────────────────────── */}
            <NavGroup label="Production" />
            <NavLink to="/admin/suppliers" icon={Building2} label="Suppliers" onClick={close} />
            <NavLink to="/admin/materials" icon={Layers} label="Materials" onClick={close} />
            <NavLink to="/admin/production-jobs" icon={Wrench} label="Production Jobs" onClick={close} />
            <NavLink to="/admin/material-allocations" icon={GitBranch} label="Material Allocations" onClick={close} />

            {/* ── INVENTORY ─────────────────────────────────── */}
            <NavGroup label="Inventory" />
            <NavLink to="/admin/inventory" icon={Boxes} label="Finished Goods" onClick={close} />
            <NavLink to="/admin/inventory/raw-materials" icon={Warehouse} label="Raw Material Stock" onClick={close} />
            <NavLink to="/admin/inventory/history" icon={Activity} label="Movement History" onClick={close} />

            {/* ── ANALYTICS & TOOLS ─────────────────────────── */}
            <NavGroup label="Analytics & Tools" />
            <NavLink to="/admin/product-intelligence" icon={BarChart2} label="Product Intelligence" onClick={close} />
            <NavLink to="/admin/excel" icon={FileSpreadsheet} label="Import / Export" onClick={close} />

            {/* ── ADMIN & ACCESS ────────────────────────────── */}
            <NavGroup label="Admin & Access" />

            {/* Team & Access accordion — admin only */}
            {isAdmin && (
              <NavAccordion
                icon={Users}
                label="Team & Access"
                open={teamOpen}
                onToggle={() => setTeamOpen(p => !p)}
                matchPaths={["/admin/users", "/admin/roles", "/admin/activity-logs"]}
              >
                <NavLink to="/admin/users" icon={Users} label="Users" onClick={close} />
                <NavLink to="/admin/roles" icon={ShieldCheck} label="Roles & Permissions" onClick={close} />
                <NavLink to="/admin/activity-logs" icon={ClipboardList} label="Activity Log" onClick={close} />
              </NavAccordion>
            )}

            {/* Profile & Security accordion */}
            <NavAccordion
              icon={User}
              label="Profile & Security"
              open={profileOpen}
              onToggle={() => setProfileOpen(p => !p)}
              matchPaths={[
                "/admin/profile",
                "/admin/2fa-setup",
                "/admin/change-password",
                "/admin/account-settings",
              ]}
            >
              <NavLink to="/admin/account-settings" label="Account Settings" onClick={close} />
              <NavLink to="/admin/profile" label="My Profile" onClick={close} />
              <NavLink to="/admin/change-password" label="Change Password" onClick={close} />
              <NavLink to="/admin/2fa-setup" label="2FA Security" onClick={close} />
            </NavAccordion>

          </nav>

          {/* User footer */}
          <div className="p-4 border-t border-[#FFFFF0]/10">
            <div className="px-4 py-2 mb-2">
              <p className="text-xs text-[#FFFFF0]/50">{user?.email || "No email"}</p>
              <p className="text-sm capitalize text-[#DACBA0]">{user?.role || "No role"}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              data-testid="admin-logout"
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#FFFFF0]/5 rounded transition-colors text-[#FFFFF0]/70"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-[#FFFFF0] border-b border-[#DACBA0]/30 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 text-[#1B4D3E]">
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="text-xs uppercase tracking-wider text-[#1B4D3E]">
              View Site →
            </Link>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
