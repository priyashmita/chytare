import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const opts = { rememberMe };
      let result;

      if (requires2FA && useRecovery) {
        result = await login(email, password, null, { recoveryCode, rememberMe });
      } else if (requires2FA) {
        result = await login(email, password, totpCode, { rememberMe });
      } else {
        result = await login(email, password, null, { rememberMe });
      }

      if (result.requires2FA) {
        setRequires2FA(true);
        toast.info("Please enter your 2FA code");
      } else if (result.success) {
        toast.success("Welcome back");
        navigate("/admin");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <img
            src="/assets/logo-gold.png"
            alt="Chytare"
            className="h-16 mx-auto mb-8"
          />
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Admin Portal</h1>
        </div>

        <form onSubmit={handleSubmit} data-testid="admin-login-form" className="space-y-6">
          {!requires2FA ? (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                  Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email"
                  className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password"
                  className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  required
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer" data-testid="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  data-testid="remember-me-checkbox"
                  className="w-4 h-4 rounded border-[#DACBA0]/50 text-[#1B4D3E] focus:ring-[#1B4D3E]"
                />
                <span className="text-sm text-[#1B4D3E]/60">Remember me for 30 days</span>
              </label>
            </>
          ) : (
            <div>
              {!useRecovery ? (
                <>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    2FA Code
                  </Label>
                  <Input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    data-testid="login-2fa"
                    placeholder="Enter 6-digit code"
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setUseRecovery(true)}
                    data-testid="use-recovery-code-btn"
                    className="mt-3 text-xs text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors block"
                  >
                    Use a recovery code instead
                  </button>
                </>
              ) : (
                <>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Recovery Code
                  </Label>
                  <Input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    data-testid="login-recovery"
                    placeholder="XXXX-XXXX"
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent text-center text-lg tracking-widest font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => { setUseRecovery(false); setRecoveryCode(""); }}
                    data-testid="use-totp-btn"
                    className="mt-3 text-xs text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors block"
                  >
                    Use authenticator code instead
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setRequires2FA(false); setTotpCode(""); setRecoveryCode(""); setUseRecovery(false); }}
                className="mt-2 text-xs text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors block"
              >
                Back to login
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
          >
            {loading ? "Signing in..." : requires2FA ? "Verify" : "Sign In"}
          </button>

          <div className="text-center mt-4">
            <Link
              to="/admin/forgot-password"
              data-testid="forgot-password-link"
              className="text-sm text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
