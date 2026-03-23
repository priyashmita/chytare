import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Check } from "lucide-react";

const Admin2FASetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(user?.totp_enabled ? "enabled" : "start");
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);

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

  const verifySetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/verify-2fa`, { totp_code: verifyCode });
      toast.success("2FA enabled successfully");
      setStep("enabled");
    } catch {
      toast.error("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/disable-2fa`, { totp_code: verifyCode });
      toast.success("2FA disabled");
      setStep("start");
      setVerifyCode("");
    } catch {
      toast.error("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-2fa-setup" className="max-w-xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1B4D3E]">
          Two-Factor Authentication
        </h1>
        <p className="text-[#1B4D3E]/60 mt-1">
          Add an extra layer of security to your account
        </p>
      </div>

      <div className="bg-white border border-[#DACBA0]/30 p-6">
        {step === "start" && (
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-[#DACBA0] mx-auto mb-6" />
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-4">
              Enable 2FA
            </h2>
            <p className="text-[#1B4D3E]/70 mb-8">
              Use an authenticator app like Google Authenticator or Authy.
            </p>
            <button
              onClick={startSetup}
              disabled={loading}
              className="btn-luxury btn-luxury-primary disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Begin Setup"}
            </button>
          </div>
        )}

        {step === "scan" && setupData && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-serif text-xl text-[#1B4D3E] mb-4">
                Scan QR Code
              </h2>
              <img
                src={setupData.qr_code}
                alt="QR"
                className="mx-auto mb-6 border p-4"
              />
              <code className="block bg-[#1B4D3E]/5 p-3 text-sm break-all">
                {setupData.secret}
              </code>
            </div>

            <form onSubmit={verifySetup} className="space-y-4">
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
              />
              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full btn-luxury btn-luxury-primary"
              >
                Verify & Enable
              </button>
            </form>
          </div>
        )}

        {step === "enabled" && (
          <div className="space-y-6 text-center">
            <Check className="w-16 h-16 text-[#1B4D3E] mx-auto" />
            <h2 className="font-serif text-xl text-[#1B4D3E]">
              2FA Enabled
            </h2>

            <form onSubmit={disable2FA}>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
              />
              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full border border-[#C08081] text-[#C08081]"
              >
                Disable 2FA
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin2FASetup;
