import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Shield,
  Check,
  Copy,
  Download,
  RefreshCw,
  Mail,
  AlertTriangle,
} from "lucide-react";

// ===================== PASSWORD SECTION =====================

const PasswordSection = () => {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    newPw: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    const p = form.newPassword;
    return [
      { label: "8+ characters", pass: p.length >= 8 },
      { label: "Uppercase letter", pass: /[A-Z]/.test(p) },
      { label: "Lowercase letter", pass: /[a-z]/.test(p) },
      { label: "Number", pass: /[0-9]/.test(p) },
    ];
  })();

  const allPass =
    strength.every((c) => c.pass) &&
    form.newPassword === form.confirmPassword &&
    form.confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (!strength.every((c) => c.pass)) {
      toast.error("Password does not meet strength requirements");
      return;
    }

    setLoading(true);

    try {
      await axios.put(`${API}/auth/change-password`, {
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      toast.success("Password changed. Please sign in again.");
      logout();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({ label, field, value, onChange }) => (
    <div>
      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <Input
          type={show[field] ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="pr-10 border-[#DACBA0]/50"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B4D3E]/40 hover:text-[#1B4D3E]"
        >
          {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-[#DACBA0]/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center">
          <Key className="w-5 h-5 text-[#1B4D3E]" />
        </div>
        <div>
          <h2 className="font-serif text-lg text-[#1B4D3E]">Change Password</h2>
          <p className="text-xs text-[#1B4D3E]/50">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          label="Current Password"
          field="current"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />

        <PasswordField
          label="New Password"
          field="newPw"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />

        {form.newPassword && (
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {strength.map((c) => (
              <span
                key={c.label}
                className={c.pass ? "text-[#1B4D3E]" : "text-[#1B4D3E]/30"}
              >
                {c.pass ? "✓" : "○"} {c.label}
              </span>
            ))}
          </div>
        )}

        <PasswordField
          label="Confirm New Password"
          field="confirm"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />

        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
          <p className="text-xs text-[#C08081]">Passwords do not match</p>
        )}

        <button
          type="submit"
          disabled={loading || !allPass}
          className="btn-luxury btn-luxury-primary disabled:opacity-40"
        >
          {loading ? "Updating..." : "Change Password"}
        </button>
      </form>

      <p className="text-xs text-[#1B4D3E]/40 mt-4">
        You will be signed out after changing your password.
      </p>
    </div>
  );
};

// ===================== 2FA SECTION =====================

const TwoFactorSection = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(user?.totp_enabled ? "enabled" : "off");
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [codesCount, setCodesCount] = useState(0);

  useEffect(() => {
    if (user?.totp_enabled) {
      axios
        .get(`${API}/auth/recovery-codes-count`)
        .then((r) => setCodesCount(r.data.count))
        .catch(() => {});
    }
  }, [user?.totp_enabled]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/setup-2fa`);
      setSetupData(res.data);
      setStep("scan");
    } catch {
      toast.error("Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify-2fa`, { totp_code: code });
      toast.success("2FA enabled");
      setRecoveryCodes(res.data.recovery_codes);
      setCodesCount(res.data.recovery_codes.length);
      setStep("codes");
      setCode("");
    } catch {
      toast.error("Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/disable-2fa`, { totp_code: code });
      toast.success("2FA disabled");
      setStep("off");
      setCode("");
      setRecoveryCodes(null);
    } catch {
      toast.error("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/regenerate-recovery-codes`, {
        totp_code: code,
      });
      setRecoveryCodes(res.data.recovery_codes);
      setCodesCount(res.data.recovery_codes.length);
      toast.success("New recovery codes generated");
      setCode("");
    } catch {
      toast.error("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success("Recovery codes copied");
    }
  };

  const downloadCodes = () => {
    if (recoveryCodes) {
      const blob = new Blob(
        [
          `Chytare Admin Recovery Codes\n${"=".repeat(30)}\n\n${recoveryCodes.join(
            "\n"
          )}\n\nStore these codes safely. Each code can only be used once.`,
        ],
        { type: "text/plain" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chytare-recovery-codes.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white border border-[#DACBA0]/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#1B4D3E]" />
        </div>
        <div>
          <h2 className="font-serif text-lg text-[#1B4D3E]">Two-Factor Authentication</h2>
          <p className="text-xs text-[#1B4D3E]/50">
            {step === "off" ? "Not enabled" : "Enabled — extra security active"}
          </p>
        </div>
      </div>

      {step === "off" && (
        <div className="text-center py-6">
          <p className="text-sm text-[#1B4D3E]/70 mb-6">
            Use an authenticator app (Google Authenticator, Authy) to add a second
            layer of security.
          </p>
          <button
            onClick={startSetup}
            disabled={loading}
            className="btn-luxury btn-luxury-primary disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Enable 2FA"}
          </button>
        </div>
      )}

      {step === "scan" && setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-[#1B4D3E]/70 mb-4">
              Scan this QR code with your authenticator app:
            </p>
            <img
              src={setupData.qr_code}
              alt="2FA QR"
              className="mx-auto mb-4 border border-[#DACBA0]/30 p-3"
            />
            <p className="text-xs text-[#1B4D3E]/50 mb-1">Manual entry key:</p>
            <code className="block bg-[#1B4D3E]/5 p-2 text-xs font-mono text-[#1B4D3E] break-all">
              {setupData.secret}
            </code>
          </div>

          <form onSubmit={verify} className="space-y-3 pt-4 border-t border-[#DACBA0]/30">
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
              Enter 6-digit code
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-xl tracking-widest"
              maxLength={6}
              placeholder="000000"
              required
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Enable"}
            </button>
          </form>
        </div>
      )}

      {step === "codes" && recoveryCodes && (
        <div className="space-y-4">
          <div className="bg-[#C08081]/10 border border-[#C08081]/20 p-4 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-[#C08081] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1B4D3E]">
                  Save your recovery codes
                </p>
                <p className="text-xs text-[#1B4D3E]/60 mt-1">
                  These codes can be used to access your account if you lose your
                  authenticator. Each code can only be used once. Store them securely.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-[#1B4D3E]/5 p-4 rounded font-mono text-sm">
            {recoveryCodes.map((c, i) => (
              <span key={i} className="text-[#1B4D3E]">
                {c}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyAllCodes}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-[#DACBA0]/50 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors rounded"
            >
              <Copy className="w-4 h-4" /> Copy All
            </button>
            <button
              onClick={downloadCodes}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-[#DACBA0]/50 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors rounded"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

          <button
            onClick={() => setStep("enabled")}
            className="w-full btn-luxury btn-luxury-primary"
          >
            I&apos;ve Saved My Codes
          </button>
        </div>
      )}

      {step === "enabled" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 py-3 px-4 bg-[#1B4D3E]/5 rounded">
            <Check className="w-5 h-5 text-[#1B4D3E]" />
            <div>
              <p className="text-sm text-[#1B4D3E] font-medium">2FA is active</p>
              <p className="text-xs text-[#1B4D3E]/50">
                {codesCount} recovery code{codesCount !== 1 ? "s" : ""} remaining
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#DACBA0]/30">
            <h3 className="text-sm font-medium text-[#1B4D3E] mb-3">
              Regenerate Recovery Codes
            </h3>
            <form onSubmit={regenerate} className="flex gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center tracking-widest"
                maxLength={6}
                placeholder="TOTP code"
                required
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-[#DACBA0]/50 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors rounded whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
            </form>
          </div>

          {recoveryCodes && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-[#1B4D3E]/5 p-4 rounded font-mono text-sm">
                {recoveryCodes.map((c, i) => (
                  <span key={i} className="text-[#1B4D3E]">
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copyAllCodes}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#DACBA0]/50 text-[#1B4D3E] hover:bg-[#DACBA0]/10 rounded"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={downloadCodes}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#DACBA0]/50 text-[#1B4D3E] hover:bg-[#DACBA0]/10 rounded"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#DACBA0]/30">
            <h3 className="text-sm font-medium text-[#C08081] mb-3">Disable 2FA</h3>
            <form onSubmit={disable} className="flex gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center tracking-widest"
                maxLength={6}
                placeholder="TOTP code"
                required
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="px-4 py-2 text-sm border border-[#C08081] text-[#C08081] hover:bg-[#C08081] hover:text-white transition-colors rounded whitespace-nowrap disabled:opacity-50"
              >
                {loading ? "..." : "Disable"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== EMAIL STATUS SECTION =====================

const EmailStatusSection = () => {
  const [configured, setConfigured] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/auth/email-config-status`)
      .then((r) => setConfigured(r.data.configured))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white border border-[#DACBA0]/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center">
          <Mail className="w-5 h-5 text-[#1B4D3E]" />
        </div>
        <div>
          <h2 className="font-serif text-lg text-[#1B4D3E]">Email Service</h2>
          <p className="text-xs text-[#1B4D3E]/50">
            For password resets and notifications
          </p>
        </div>
      </div>

      {configured === null ? (
        <p className="text-sm text-[#1B4D3E]/50">Checking...</p>
      ) : configured ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1B4D3E]/5 rounded">
          <Check className="w-4 h-4 text-[#1B4D3E]" />
          <p className="text-sm text-[#1B4D3E]">
            Email service is configured (Resend)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-4 py-3 bg-[#C08081]/10 border border-[#C08081]/20 rounded">
            <AlertTriangle className="w-4 h-4 text-[#C08081] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#1B4D3E]">Email service not configured</p>
              <p className="text-xs text-[#1B4D3E]/60 mt-1">
                Password reset emails and notifications will not be sent.
              </p>
            </div>
          </div>
          <p className="text-xs text-[#1B4D3E]/50">
            To enable: add{" "}
            <code className="bg-[#1B4D3E]/5 px-1.5 py-0.5 rounded font-mono text-xs">
              RESEND_API_KEY
            </code>{" "}
            to the backend environment.
          </p>
        </div>
      )}
    </div>
  );
};

// ===================== MAIN PAGE =====================

const AdminAccountSettings = () => {
  return (
    <div data-testid="admin-account-settings" className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1B4D3E]">Account Settings</h1>
        <p className="text-[#1B4D3E]/60 mt-1">
          Manage your password, security, and account preferences
        </p>
      </div>

      <div className="space-y-6">
        <PasswordSection />
        <TwoFactorSection />
        <EmailStatusSection />
      </div>
    </div>
  );
};

export default AdminAccountSettings;
