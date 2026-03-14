import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Pages
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

// Admin Pages
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductEdit from "@/pages/admin/AdminProductEdit";
import AdminStories from "@/pages/admin/AdminStories";
import AdminStoryEdit from "@/pages/admin/AdminStoryEdit";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminEnquiries from "@/pages/admin/AdminEnquiries";
import AdminInventory from "@/pages/admin/AdminInventory";
import Admin2FASetup from "@/pages/admin/Admin2FASetup";
import AdminProfile from "@/pages/admin/AdminProfile";
import AdminChangePassword from "@/pages/admin/AdminChangePassword";
import AdminForgotPassword from "@/pages/admin/AdminForgotPassword";
import AdminResetPassword from "@/pages/admin/AdminResetPassword";
import AdminAccountSettings from "@/pages/admin/AdminAccountSettings";
import AdminAboutEdit from "@/pages/admin/AdminAboutEdit";

// New Admin Foundation Pages
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserEdit from "@/pages/admin/AdminUserEdit";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminActivityLog from "@/pages/admin/AdminActivityLog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
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
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Auth error:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, totpCode = null, { recoveryCode = null, rememberMe = false } = {}) => {
    const response = await axios.post(`${API}/auth/login`, {
      email,
      password,
      totp_code: totpCode,
      recovery_code: recoveryCode,
      remember_me: rememberMe,
    });

    if (response.data.requires_2fa) {
      return { requires2FA: true };
    }

    const { token: newToken, user: userData } = response.data;
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

// Settings Context
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
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{ siteSettings, homeSettings, refreshSettings: fetchSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <div className="w-8 h-8 border-2 border-[#1B4D3E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

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
              {/* Public Routes */}
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

              {/* Admin Auth Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
              <Route path="/admin/products/new" element={<ProtectedRoute><AdminProductEdit /></ProtectedRoute>} />
              <Route path="/admin/products/:id" element={<ProtectedRoute><AdminProductEdit /></ProtectedRoute>} />
              <Route path="/admin/stories" element={<ProtectedRoute><AdminStories /></ProtectedRoute>} />
              <Route path="/admin/stories/new" element={<ProtectedRoute><AdminStoryEdit /></ProtectedRoute>} />
              <Route path="/admin/stories/:id" element={<ProtectedRoute><AdminStoryEdit /></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
              <Route path="/admin/enquiries" element={<ProtectedRoute><AdminEnquiries /></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute><AdminInventory /></ProtectedRoute>} />
              <Route path="/admin/2fa-setup" element={<ProtectedRoute><Admin2FASetup /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
              <Route path="/admin/change-password" element={<ProtectedRoute><AdminChangePassword /></ProtectedRoute>} />
              <Route path="/admin/account-settings" element={<ProtectedRoute><AdminAccountSettings /></ProtectedRoute>} />

              {/* Admin Only Routes */}
              <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/pages/about" element={<ProtectedRoute adminOnly><AdminAboutEdit /></ProtectedRoute>} />

              {/* New: Users & Roles Management */}
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/users/new" element={<ProtectedRoute adminOnly><AdminUserEdit /></ProtectedRoute>} />
              <Route path="/admin/users/:id" element={<ProtectedRoute adminOnly><AdminUserEdit /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute adminOnly><AdminRoles /></ProtectedRoute>} />
              <Route path="/admin/activity-logs" element={<ProtectedRoute adminOnly><AdminActivityLog /></ProtectedRoute>} />

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
