import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      await axios.get(`${API}/auth/verify-reset-token/${token}`);
      setTokenValid(true);
    } catch {
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setResetDone(true);
      toast.success("Password reset successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Reset failed. Token may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <div className="animate-pulse text-[#1B4D3E]/60">Verifying reset link...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src="/assets/logo-gold.png" alt="Chytare" className="h-14 mx-auto mb-6" />
          <h1 className="font-serif text-2xl text-[#1B4D3E]">Set New Password</h1>
        </div>

        {!token || !tokenValid ? (
          <div className="bg-white border border-[#C08081]/30 p-8 text-center" data-testid="invalid-token-message">
            <AlertCircle className="w-12 h-12 text-[#C08081] mx-auto mb-4" />
            <h2 className="font-serif text-lg text-[#1B4D3E] mb-2">Invalid or Expired Link</h2>
            <p className="text-sm text-[#1B4D3E]/60 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/admin/forgot-password"
              className="btn-luxury btn-luxury-primary inline-block"
              data-testid="request-new-link"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : resetDone ? (
          <div className="bg-white border border-[#DACBA0]/30 p-8 text-center" data-testid="reset-success-message">
            <CheckCircle className="w-12 h-12 text-[#1B4D3E] mx-auto mb-4" />
            <h2 className="font-serif text-lg text-[#1B4D3E] mb-2">Password Reset Complete</h2>
            <p className="text-sm text-[#1B4D3E]/60 mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              to="/admin/login"
              className="btn-luxury btn-luxury-primary inline-block"
              data-testid="go-to-login"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#DACBA0]/30 p-8 space-y-6" data-testid="reset-password-form">
            <p className="text-sm text-[#1B4D3E]/60">
              Choose a strong password for your admin account.
            </p>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">New Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                data-testid="new-password-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                placeholder="Re-enter your password"
                required
                minLength={8}
                data-testid="confirm-password-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
              data-testid="reset-submit-btn"
            >
              {loading ? "Resetting..." : "Set New Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 text-sm text-[#1B4D3E]/60 hover:text-[#1B4D3E]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminResetPassword;
