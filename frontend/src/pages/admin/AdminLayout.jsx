import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";

// v2
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(
    location.pathname.startsWith("/admin/profile") ||
    location.pathname === "/admin/2fa-setup" ||
    location.pathname === "/admin/change-password" ||
    location.pathname === "/admin/account-settings"
  );
  const [pagesMenuOpen, setPagesMenuOpen] = useState(
    location.pathname.startsWith("/admin/pages")
  );
  const [teamMenuOpen, setTeamMenuOpen] = useState(
    location.pathname.startsWith("/admin/users") ||
    location.pathname.startsWith("/admin/roles") ||
    location.pathname.startsWith("/admin/activity-logs")
  );

  const isAdmin = user?.role === "admin";

  const mainMenuItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Homepage CMS", path: "/admin/settings", icon: Home, adminOnly: true },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Stories", path: "/admin/stories", icon: BookOpen },
    { name: "Categories", path: "/admin/categories", icon: Tags },
    { name: "Enquiries", path: "/admin/enquiries", icon: MessageSquare },
    { name: "Inventory", path: "/admin/inventory", icon: Boxes },
    { name: "Suppliers", path: "/admin/suppliers", icon: Building2 },
    { name: "Materials", path: "/admin/materials", icon: Layers },
    { name: "Product Master", path: "/admin/product-master", icon: BookMarked },
    { name: "Production Jobs", path: "/admin/production-jobs", icon: Wrench },
    { name: "Material Allocations", path: "/admin/material-allocations", icon: GitBranch },
    { name: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { name: "Product Intelligence", path: "/admin/product-intelligence", icon: BarChart2 },
    { name: "Excel Import / Export", path: "/admin/excel", icon: FileSpreadsheet },
    { name: "Import / Export", path: "/admin/import-export", icon: FileSpreadsheet },
    { name: "Site Settings", path: "/admin/settings?tab=site", icon: Settings, adminOnly: true },
  ];

  const pagesMenuItems = [
    { name: "About Page", path: "/admin/pages/about" },
  ];

  const teamMenuItems = [
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Roles & Permissions", path: "/admin/roles", icon: ShieldCheck },
    { name: "Activity Log", path: "/admin/activity-logs", icon: ClipboardList },
  ];

  const profileMenuItems = [
    { name: "Account Settings", path: "/admin/account-settings" },
    { name: "My Profile", path: "/admin/profile" },
    { name: "Change Password", path: "/admin/change-password" },
    { name: "2FA Security", path: "/admin/2fa-setup" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const isPagesActive = location.pathname.startsWith("/admin/pages");
  const isTeamActive = location.pathname.startsWith("/admin/users") ||
    location.pathname.startsWith("/admin/roles") ||
    location.pathname.startsWith("/admin/activity-logs");

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex">
      {/* Sidebar */}
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
              />
            </Link>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto text-[#FFFFF0]">
            {mainMenuItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const isActive = location.pathname === item.path;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    isActive
                      ? "bg-[#DACBA0]/20 text-[#DACBA0]"
                      : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                  }`}
                  style={{ color: isActive ? '#DACBA0' : 'rgba(255, 255, 240, 0.7)' }}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}

            {/* Pages Section */}
            <div className="pt-4 mt-4 border-t border-[#FFFFF0]/10">
              <button
                onClick={() => setPagesMenuOpen(!pagesMenuOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded transition-colors ${
                  isPagesActive || pagesMenuOpen
                    ? "bg-[#DACBA0]/20 text-[#DACBA0]"
                    : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                }`}
                style={{ color: (isPagesActive || pagesMenuOpen) ? '#DACBA0' : 'rgba(255, 255, 240, 0.7)' }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">Pages</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${pagesMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {pagesMenuOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {pagesMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm ${
                          isActive ? "text-[#DACBA0]" : "text-[#FFFFF0]/60 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                        }`}
                        style={{ color: isActive ? '#DACBA0' : 'rgba(255, 255, 240, 0.6)' }}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team & Access — Admin only */}
            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={() => setTeamMenuOpen(!teamMenuOpen)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded transition-colors ${
                    isTeamActive || teamMenuOpen
                      ? "bg-[#DACBA0]/20 text-[#DACBA0]"
                      : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                  }`}
                  style={{ color: (isTeamActive || teamMenuOpen) ? '#DACBA0' : 'rgba(255, 255, 240, 0.7)' }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">Team & Access</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${teamMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {teamMenuOpen && (
                  <div className="mt-1 ml-4 space-y-1">
                    {teamMenuItems.map((item) => {
                      const isActive = location.pathname.startsWith(item.path);
                      const IconComponent = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm ${
                            isActive ? "text-[#DACBA0]" : "text-[#FFFFF0]/60 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                          }`}
                          style={{ color: isActive ? '#DACBA0' : 'rgba(255, 255, 240, 0.6)' }}
                        >
                          <IconComponent className="w-4 h-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Profile & Security */}
            <div className="pt-2">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded transition-colors ${
                  profileMenuOpen || location.pathname.includes("/admin/profile") || location.pathname === "/admin/2fa-setup" || location.pathname === "/admin/change-password" || location.pathname === "/admin/account-settings"
                    ? "bg-[#DACBA0]/20 text-[#DACBA0]"
                    : "text-[#FFFFF0]/70 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                }`}
                style={{
                  color: (profileMenuOpen || location.pathname.includes("/admin/profile") || location.pathname === "/admin/2fa-setup" || location.pathname === "/admin/change-password" || location.pathname === "/admin/account-settings")
                    ? '#DACBA0'
                    : 'rgba(255, 255, 240, 0.7)'
                }}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5" />
                  <span className="text-sm">Profile & Security</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {profileMenuOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {profileMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm ${
                          isActive ? "text-[#DACBA0]" : "text-[#FFFFF0]/60 hover:text-[#FFFFF0] hover:bg-[#FFFFF0]/5"
                        }`}
                        style={{ color: isActive ? '#DACBA0' : 'rgba(255, 255, 240, 0.6)' }}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-[#FFFFF0]/10">
            <div className="px-4 py-2 mb-2">
              <p className="text-xs" style={{ color: 'rgba(255, 255, 240, 0.5)' }}>{user?.email}</p>
              <p className="text-sm capitalize" style={{ color: '#DACBA0' }}>{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              data-testid="admin-logout"
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#FFFFF0]/5 rounded transition-colors"
              style={{ color: 'rgba(255, 255, 240, 0.7)' }}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-[#FFFFF0] border-b border-[#DACBA0]/30 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-[#1B4D3E]">
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="text-xs uppercase tracking-wider text-[#1B4D3E]">
              View Site →
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
