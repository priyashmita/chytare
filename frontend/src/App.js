import { useEffect, useState, createContext, useContext, lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// ─── Public pages — eagerly loaded (part of main bundle) ─────────────────────
import HomePage from "@/pages/HomePage";
import CollectionsPage from "@/pages/CollectionsPage";
import CollectionListingPage from "@/pages/CollectionListingPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import StoriesPage from "@/pages/StoriesPage";
import StoryDetailPage from "@/pages/StoryDetailPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import WearableWhispersPage from "@/pages/WearableWhispersPage";
import PrivateAccessPage from "@/pages/PrivateAccessPage";
import PolicyPage from "@/pages/PolicyPage";

// ─── Admin pages — lazy loaded (separate chunk, not in public bundle) ─────────
// Auth (loaded immediately on /admin/* visit)
const AdminLoginPage        = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminForgotPassword   = lazy(() => import("@/pages/admin/AdminForgotPassword"));
const AdminResetPassword    = lazy(() => import("@/pages/admin/AdminResetPassword"));

// Core admin (only loaded after login)
const AdminDashboard        = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProducts         = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminProductEdit      = lazy(() => import("@/pages/admin/AdminProductEdit"));
const AdminStories          = lazy(() => import("@/pages/admin/AdminStories"));
const AdminStoryEdit        = lazy(() => import("@/pages/admin/AdminStoryEdit"));
const AdminCategories       = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminSettings         = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminEnquiries        = lazy(() => import("@/pages/admin/AdminEnquiries"));
const AdminInventory        = lazy(() => import("@/pages/admin/AdminInventory"));
const Admin2FASetup         = lazy(() => import("@/pages/admin/Admin2FASetup"));
const AdminProfile          = lazy(() => import("@/pages/admin/AdminProfile"));
const AdminChangePassword   = lazy(() => import("@/pages/admin/AdminChangePassword"));
const AdminAccountSettings  = lazy(() => import("@/pages/admin/AdminAccountSettings"));
const AdminAboutEdit        = lazy(() => import("@/pages/admin/AdminAboutEdit"));

// Suppliers
const AdminSuppliers       = lazy(() => import("@/pages/admin/AdminSuppliers"));
const AdminSupplierEdit    = lazy(() => import("@/pages/admin/AdminSupplierEdit"));
const AdminSupplierDetail  = lazy(() => import("@/pages/admin/AdminSupplierDetail"));

// Materials
const AdminMaterials       = lazy(() => import("@/pages/admin/AdminMaterials"));
const AdminMaterialEdit    = lazy(() => import("@/pages/admin/AdminMaterialEdit"));
const AdminMaterialDetail  = lazy(() => import("@/pages/admin/AdminMaterialDetail"));

// Product Master
const AdminProductMaster       = lazy(() => import("@/pages/admin/AdminProductMaster"));
const AdminProductMasterEdit   = lazy(() => import("@/pages/admin/AdminProductMasterEdit"));
const AdminProductMasterDetail = lazy(() => import("@/pages/admin/AdminProductMasterDetail"));

// Production Jobs
const AdminProductionJobs      = lazy(() => import("@/pages/admin/AdminProductionJobs"));
const AdminProductionJobEdit   = lazy(() => import("@/pages/admin/AdminProductionJobEdit"));
const AdminProductionJobDetail = lazy(() => import("@/pages/admin/AdminProductionJobDetail"));

// Team & access (super admin only — smallest chunk, loaded last)
const AdminUsers            = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminUserEdit         = lazy(() => import("@/pages/admin/AdminUserEdit"));
const AdminRoles            = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminActivityLog      = lazy(() => import("@/pages/admin/AdminActivityLog"));

// ─── Config ───────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("chytare_token"));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, totpCode = null, { recoveryCode = null, rememberMe = false } = {}) => {
    const res = await axios.post(`${API}/auth/login`, {
      email, password,
      totp_code: totpCode,
      recovery_code: recoveryCode,
      remember_me: rememberMe,
    });
    if (res.data.requires_2fa) return { requires2FA: true };
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem("chytare_token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem("chytare_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, token, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Settings Context ─────────────────────────────────────────────────────────
const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState(null);
  const [homeSettings, setHomeSettings] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const [siteRes, homeRes] = await Promise.all([
        axios.get(`${API}/settings/site`),
        axios.get(`${API}/settings/home`),
      ]);
      setSiteSettings(siteRes.data);
      setHomeSettings(homeRes.data);
    } catch (err) {
      console.error("Settings error:", err);
    }
  };

  return (
    <SettingsContext.Provider value={{ siteSettings, homeSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// ─── Route guards ─────────────────────────────────────────────────────────────
const PublicSpinner = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFF0" }}>
    <div style={{ width: 32, height: 32, border: "2px solid #1B4D3E", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Wraps all lazy admin routes — shows spinner while chunk loads
const AdminSuspense = ({ children }) => (
  <Suspense fallback={<PublicSpinner />}>{children}</Suspense>
);

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <PublicSpinner />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/admin" replace />;
  return children;
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  useEffect(() => {
    axios.post(`${API}/init-defaults`).catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <div className="App min-h-screen bg-[#FFFFF0]">
          <BrowserRouter>
            <Routes>

              {/* ── Public routes — no lazy loading ── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:type" element={<CollectionListingPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/stories/:slug" element={<StoryDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/wearable-whispers" element={<WearableWhispersPage />} />
              <Route path="/private-access" element={<PrivateAccessPage />} />
              <Route path="/policy/:type" element={<PolicyPage />} />
              <Route path="/limited-edition-policy" element={<PolicyPage />} />
              <Route path="/authenticity-craftsmanship" element={<PolicyPage />} />
              <Route path="/made-to-order-policy" element={<PolicyPage />} />

              {/* ── Admin auth routes — lazy, no auth required ── */}
              <Route path="/admin/login" element={<AdminSuspense><AdminLoginPage /></AdminSuspense>} />
              <Route path="/admin/forgot-password" element={<AdminSuspense><AdminForgotPassword /></AdminSuspense>} />
              <Route path="/admin/reset-password" element={<AdminSuspense><AdminResetPassword /></AdminSuspense>} />

              {/* ── Admin protected routes — lazy + auth required ── */}
              <Route path="/admin" element={<ProtectedRoute><AdminSuspense><AdminDashboard /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute><AdminSuspense><AdminProducts /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/products/new" element={<ProtectedRoute><AdminSuspense><AdminProductEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/products/:id" element={<ProtectedRoute><AdminSuspense><AdminProductEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/stories" element={<ProtectedRoute><AdminSuspense><AdminStories /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/stories/new" element={<ProtectedRoute><AdminSuspense><AdminStoryEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/stories/:id" element={<ProtectedRoute><AdminSuspense><AdminStoryEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute><AdminSuspense><AdminCategories /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/enquiries" element={<ProtectedRoute><AdminSuspense><AdminEnquiries /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute><AdminSuspense><AdminInventory /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/2fa-setup" element={<ProtectedRoute><AdminSuspense><Admin2FASetup /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute><AdminSuspense><AdminProfile /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/change-password" element={<ProtectedRoute><AdminSuspense><AdminChangePassword /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/account-settings" element={<ProtectedRoute><AdminSuspense><AdminAccountSettings /></AdminSuspense></ProtectedRoute>} />

              {/* ── Supplier routes ── */}
              <Route path="/admin/suppliers" element={<ProtectedRoute><AdminSuspense><AdminSuppliers /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/suppliers/new" element={<ProtectedRoute><AdminSuspense><AdminSupplierEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/suppliers/:id" element={<ProtectedRoute><AdminSuspense><AdminSupplierDetail /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/suppliers/:id/edit" element={<ProtectedRoute><AdminSuspense><AdminSupplierEdit /></AdminSuspense></ProtectedRoute>} />

              {/* ── Material routes ── */}
              <Route path="/admin/materials" element={<ProtectedRoute><AdminSuspense><AdminMaterials /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/materials/new" element={<ProtectedRoute><AdminSuspense><AdminMaterialEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/materials/:id" element={<ProtectedRoute><AdminSuspense><AdminMaterialDetail /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/materials/:id/edit" element={<ProtectedRoute><AdminSuspense><AdminMaterialEdit /></AdminSuspense></ProtectedRoute>} />

              {/* ── Product Master routes ── */}
              <Route path="/admin/product-master" element={<ProtectedRoute><AdminSuspense><AdminProductMaster /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/product-master/new" element={<ProtectedRoute><AdminSuspense><AdminProductMasterEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/product-master/:id" element={<ProtectedRoute><AdminSuspense><AdminProductMasterDetail /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/product-master/:id/edit" element={<ProtectedRoute><AdminSuspense><AdminProductMasterEdit /></AdminSuspense></ProtectedRoute>} />

              {/* ── Production Job routes ── */}
              <Route path="/admin/production-jobs" element={<ProtectedRoute><AdminSuspense><AdminProductionJobs /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/production-jobs/new" element={<ProtectedRoute><AdminSuspense><AdminProductionJobEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/production-jobs/:id" element={<ProtectedRoute><AdminSuspense><AdminProductionJobDetail /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/production-jobs/:id/edit" element={<ProtectedRoute><AdminSuspense><AdminProductionJobEdit /></AdminSuspense></ProtectedRoute>} />

              {/* ── Admin only routes ── */}
              <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSuspense><AdminSettings /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/pages/about" element={<ProtectedRoute adminOnly><AdminSuspense><AdminAboutEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminSuspense><AdminUsers /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/users/new" element={<ProtectedRoute adminOnly><AdminSuspense><AdminUserEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/users/:id" element={<ProtectedRoute adminOnly><AdminSuspense><AdminUserEdit /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute adminOnly><AdminSuspense><AdminRoles /></AdminSuspense></ProtectedRoute>} />
              <Route path="/admin/activity-logs" element={<ProtectedRoute adminOnly><AdminSuspense><AdminActivityLog /></AdminSuspense></ProtectedRoute>} />

            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </div>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
export { API, BACKEND_URL };
