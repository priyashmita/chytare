import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API, useAuth } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Eye, EyeOff } from "lucide-react";

const AdminChangePassword = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/auth/change-password`, {
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      toast.success("Password changed successfully. Please log in again.");
      logout();
      navigate("/admin/login");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <AdminLayout>
      <div data-testid="admin-change-password" className="max-w-xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Change Password</h1>
          <p className="text-[#1B4D3E]/60 mt-1">Update your account password</p>
        </div>

        <div className="bg-white border border-[#DACBA0]/30 p-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#DACBA0]/30">
            <div className="w-12 h-12 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center">
              <Key className="w-6 h-6 text-[#1B4D3E]" />
            </div>
            <div>
              <p className="font-medium text-[#1B4D3E]">{user?.email}</p>
              <p className="text-xs text-[#1B4D3E]/60">Changing password for this account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                Current Password
              </Label>
              <div className="relative mt-2">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  data-testid="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B4D3E]/50 hover:text-[#1B4D3E]"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                New Password
              </Label>
              <div className="relative mt-2">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  data-testid="new-password"
                  className="pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B4D3E]/50 hover:text-[#1B4D3E]"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#1B4D3E]/50 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                Confirm New Password
              </Label>
              <div className="relative mt-2">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  data-testid="confirm-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B4D3E]/50 hover:text-[#1B4D3E]"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                data-testid="change-password-submit"
                className="btn-luxury btn-luxury-primary disabled:opacity-50"
              >
                {loading ? "Updating..." : "Change Password"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/profile")}
                className="btn-luxury btn-luxury-secondary"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#DACBA0]/30">
            <p className="text-xs text-[#1B4D3E]/50">
              After changing your password, you will be logged out and need to sign in again with your new password.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChangePassword;
