// CHYTARE-CLEAN-v3-TEST-ROUTE
import { useEffect, useState, createContext, useContext, lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

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
import AdminLayout from "@/pages/admin/AdminLayout";

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminForgotPassword = lazy(() => import("@/pages/admin/AdminForgotPassword"));
const AdminResetPassword = lazy(() => import("@/pages/admin/AdminResetPassword"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("@/pages/admin/AdminProductEdit"));
const AdminStories = lazy(() => import("@/pages/admin/AdminStories"));
const AdminStoryEdit = lazy(() => import("@/pages/admin/AdminStoryEdit"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminEnquiries = lazy(() => import("@/pages/admin/AdminEnquiries"));
const AdminInventory = lazy(() => import("@/pages/admin/AdminInventory"));
const Admin2FASetup = lazy(() => import("@/pages/admin/Admin2FASetup"));
const AdminProfile = lazy(() => import("@/pages/admin/AdminProfile"));
const AdminChangePassword = lazy(() => import("@/pages/admin/AdminChangePassword"));
const AdminAccountSettings = lazy(() => import("@/pages/admin/AdminAccountSettings"));
const AdminAboutEdit = lazy(() => import("@/pages/admin/AdminAboutEdit"));
const AdminSuppliers = lazy(() => import("@/pages/admin/AdminSuppliers"));
const AdminSupplierEdit = lazy(() => import("@/pages/admin/AdminSupplierEdit"));
const AdminSupplierDetail = lazy(() => import("@/pages/admin/AdminSupplierDetail"));
const AdminMaterials = lazy(() => import("@/pages/admin/AdminMaterials"));
const AdminMaterialEdit = lazy(() => import("@/pages/admin/AdminMaterialEdit"));
const AdminMaterialDetail = lazy(() => import("@/pages/admin/AdminMaterialDetail"));
const AdminProductMaster = lazy(() => import("@/pages/admin/AdminProductMaster"));
const AdminProductMasterEdit = lazy(() => import("@/pages/admin/AdminProductMasterEdit"));
const AdminProductMasterDetail = lazy(() => import("@/pages/admin/AdminProductMasterDetail"));
const AdminProductionJobs = lazy(() => import("@/pages/admin/AdminProductionJobs"));
const AdminProductionJobEdit = lazy(() => import("@/pages/admin/AdminProductionJobEdit"));
const AdminProductionJobDetail = lazy(() => import("@/pages/admin/AdminProductionJobDetail"));
const AdminMaterialAllocations = lazy(() => import("@/pages/admin/AdminMaterialAllocations"));
const AdminMaterialAllocationEdit = lazy(() => import("@/pages/admin/AdminMaterialAllocationEdit"));
const AdminMaterialAllocationDetail = lazy(() => import("@/pages/admin/AdminMaterialAllocationDetail"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/AdminOrderDetail"));
const AdminOrderEdit = lazy(() => import("@/pages/admin/AdminOrderEdit"));
const AdminEnquiryDetail = lazy(() => import("@/pages/admin/AdminEnquiryDetail"));
const AdminEnquiryEdit = lazy(() => import("@/pages/admin/AdminEnquiryEdit"));
const AdminProductIntelligence = lazy(() => import("@/pages/admin/AdminProductIntelligence"));
const AdminProductIntelligenceDetail = lazy(() => import("@/pages/admin/AdminProductIntelligenceDetail"));
const AdminExcelImport = lazy(() => import("@/pages/admin/AdminExcelImport"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminUserEdit = lazy(() => import("@/pages/admin/AdminUserEdit"));
const AdminRoles = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminActivityLog = lazy(() => import("@/pages/admin/AdminActivityLog"));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

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

  const login = async (
    email,
    password,
    totpCode = null,
    { recoveryCode = null, rememberMe = false } = {}
  ) => {
    const res = await axios.post(`${API}/auth/login`, {
      email,
      password,
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

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState(null);
  const [homeSettings, setHomeSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

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

const PublicSpinner = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFFF0",
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        border: "2px solid #1B4D3E",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const AdminSuspense = ({ children }) => (
  <Suspense fallback={<PublicSpinner />}>{children}</Suspense>
);

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <PublicSpinner />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (adminOnly && user.role !== "admin" && user.role !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const AdminShell = () => (
  <AdminSuspense>
    <AdminLayout />
  </AdminSuspense>
);

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
              <Route
                path="/test"
                element={
                  <h1 style={{ fontSize: "48px", padding: "40px" }}>
                    TEST PAGE WORKING
                  </h1>
                }
              />

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

              <Route
                path="/admin/login"
                element={
                  <AdminSuspense>
                    <AdminLoginPage />
                  </AdminSuspense>
                }
              />
              <Route
                path="/admin/forgot-password"
                element={
                  <AdminSuspense>
                    <AdminForgotPassword />
                  </AdminSuspense>
                }
              />
              <Route
                path="/admin/reset-password"
                element={
                  <AdminSuspense>
                    <AdminResetPassword />
                  </AdminSuspense>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />

                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductEdit />} />
                <Route path="products/:id" element={<AdminProductEdit />} />

                <Route path="stories" element={<AdminStories />} />
                <Route path="stories/new" element={<AdminStoryEdit />} />
                <Route path="stories/:id" element={<AdminStoryEdit />} />

                <Route path="categories" element={<AdminCategories />} />
                <Route path="enquiries" element={<AdminEnquiries />} />
                <Route path="enquiries/new" element={<AdminEnquiryEdit />} />
                <Route path="enquiries/:id" element={<AdminEnquiryDetail />} />
                <Route path="enquiries/:id/edit" element={<AdminEnquiryEdit />} />

                <Route path="inventory" element={<AdminInventory />} />
                <Route path="2fa-setup" element={<Admin2FASetup />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="change-password" element={<AdminChangePassword />} />
                <Route path="account-settings" element={<AdminAccountSettings />} />

                <Route path="suppliers" element={<AdminSuppliers />} />
                <Route path="suppliers/new" element={<AdminSupplierEdit />} />
                <Route path="suppliers/:id" element={<AdminSupplierDetail />} />
                <Route path="suppliers/:id/edit" element={<AdminSupplierEdit />} />

                <Route path="materials" element={<AdminMaterials />} />
                <Route path="materials/new" element={<AdminMaterialEdit />} />
                <Route path="materials/:id" element={<AdminMaterialDetail />} />
                <Route path="materials/:id/edit" element={<AdminMaterialEdit />} />

                <Route path="product-master" element={<AdminProductMaster />} />
                <Route path="product-master/new" element={<AdminProductMasterEdit />} />
                <Route path="product-master/:id" element={<AdminProductMasterDetail />} />
                <Route path="product-master/:id/edit" element={<AdminProductMasterEdit />} />

                <Route path="production-jobs" element={<AdminProductionJobs />} />
                <Route path="production-jobs/new" element={<AdminProductionJobEdit />} />
                <Route path="production-jobs/:id" element={<AdminProductionJobDetail />} />
                <Route path="production-jobs/:id/edit" element={<AdminProductionJobEdit />} />

                <Route path="material-allocations" element={<AdminMaterialAllocations />} />
                <Route path="material-allocations/new" element={<AdminMaterialAllocationEdit />} />
                <Route path="material-allocations/:id" element={<AdminMaterialAllocationDetail />} />
                <Route path="material-allocations/:id/edit" element={<AdminMaterialAllocationEdit />} />

                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/new" element={<AdminOrderEdit />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="orders/:id/edit" element={<AdminOrderEdit />} />

                <Route path="product-intelligence" element={<AdminProductIntelligence />} />
                <Route
                  path="product-intelligence/:id"
                  element={<AdminProductIntelligenceDetail />}
                />

                <Route path="excel" element={<AdminExcelImport />} />

                <Route
                  path="settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="pages/about"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminAboutEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users/new"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminUserEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users/:id"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminUserEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminRoles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="activity-logs"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminActivityLog />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </div>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
