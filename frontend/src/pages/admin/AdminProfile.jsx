import { useEffect, useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
 "./AdminLayout";
import { Link } from "react-router-dom";
import { User, Shield, Key, Mail, BadgeCheck, Clock, Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AdminProfile = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setProfile(res.data);
      setNewName(res.data.name || "");
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await axios.put(`${API}/auth/profile`, { name: newName.trim() });
      toast.success("Display name updated");
      setEditingName(false);
      fetchProfile();
      refreshUser?.();
    } catch (error) {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#DACBA0]/20 w-1/3" />
          <div className="h-48 bg-[#DACBA0]/20" />
        </div>
      
    );
  }

  const p = profile || user || {};

  return (
    
      <div data-testid="admin-profile">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">My Profile</h1>
          <p className="text-[#1B4D3E]/60 mt-1">Manage your account settings and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <div className="lg:col-span-2 bg-white border border-[#DACBA0]/30 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-[#1B4D3E] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-[#DACBA0]" />
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs"
                      data-testid="edit-name-input"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-2 text-[#1B4D3E] hover:text-[#DACBA0]"
                      data-testid="save-name-btn"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-2 text-[#C08081] text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl text-[#1B4D3E]" data-testid="profile-name">{p.name}</h2>
                    <button
                      onClick={() => { setNewName(p.name || ""); setEditingName(true); }}
                      className="p-1 text-[#1B4D3E]/40 hover:text-[#DACBA0]"
                      data-testid="edit-name-btn"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-[#1B4D3E]/60 capitalize">{p.role}</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-[#DACBA0]/30 pt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#DACBA0]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Email</p>
                  <p className="text-[#1B4D3E]" data-testid="profile-email">{p.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-[#DACBA0]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Role</p>
                  <p className="text-[#1B4D3E] capitalize">{p.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#DACBA0]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Two-Factor Authentication</p>
                  <p className={p.totp_enabled ? "text-[#1B4D3E] font-medium" : "text-[#C08081]"} data-testid="profile-2fa-status">
                    {p.totp_enabled ? "Enabled" : "Not Enabled"}
                  </p>
                  {p.totp_enabled_at && (
                    <p className="text-xs text-[#1B4D3E]/40 mt-0.5">Enabled on {formatDate(p.totp_enabled_at)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#DACBA0]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Last Login</p>
                  <p className="text-[#1B4D3E]" data-testid="profile-last-login">{formatDate(p.last_login)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Link
              to="/admin/change-password"
              data-testid="profile-change-password"
              className="block bg-white border border-[#DACBA0]/30 p-6 hover:border-[#DACBA0] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-[#1B4D3E]" />
                <h3 className="font-medium text-[#1B4D3E]">Change Password</h3>
              </div>
              <p className="text-sm text-[#1B4D3E]/60">Update your account password</p>
            </Link>

            <Link
              to="/admin/2fa-setup"
              data-testid="profile-2fa-setup"
              className="block bg-white border border-[#DACBA0]/30 p-6 hover:border-[#DACBA0] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-[#1B4D3E]" />
                <h3 className="font-medium text-[#1B4D3E]">2FA Security</h3>
              </div>
              <p className="text-sm text-[#1B4D3E]/60">
                {p.totp_enabled ? "Manage your two-factor authentication" : "Enable two-factor authentication for added security"}
              </p>
            </Link>
          </div>
        </div>

        {/* Security Recommendation */}
        {!p.totp_enabled && (
          <div className="mt-6 bg-[#FFD700]/10 border border-[#FFD700]/30 p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#1B4D3E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B4D3E]">Security Recommendation</p>
              <p className="text-sm text-[#1B4D3E]/70 mt-1">
                We recommend enabling two-factor authentication (2FA) to protect your admin account.
                <Link to="/admin/2fa-setup" className="ml-1 text-[#1B4D3E] underline hover:text-[#DACBA0]">
                  Enable 2FA now
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    
  );
};

export default AdminProfile;
