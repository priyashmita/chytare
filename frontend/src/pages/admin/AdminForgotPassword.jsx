import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, AlertTriangle } from "lucide-react";

const AdminForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email });
      setEmailConfigured(res.data.email_configured !== false);
      setSent(true);
      if (res.data.email_configured === false) {
        toast.warning("Email sending is not configured yet.");
      } else if (res.data.email_sent) {
        toast.success("Reset link sent to your email.");
      } else {
        toast.info("Request processed.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src="/assets/logo-gold.png" alt="Chytare" className="h-14 mx-auto mb-6" />
          <h1 className="font-serif text-2xl text-[#1B4D3E]">Reset Password</h1>
        </div>

        {sent ? (
          emailConfigured ? (
            <div className="bg-white border border-[#DACBA0]/30 p-8 text-center" data-testid="reset-sent-message">
              <div className="w-16 h-16 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#1B4D3E]" />
              </div>
              <h2 className="font-serif text-lg text-[#1B4D3E] mb-2">Check Your Email</h2>
              <p className="text-sm text-[#1B4D3E]/60 mb-6">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-[#1B4D3E]/40 mb-6">
                Don't see it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setSent(false)}
                data-testid="try-different-email-btn"
                className="text-sm text-[#1B4D3E] underline hover:text-[#DACBA0]"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#C08081]/30 p-8 text-center" data-testid="email-not-configured-message">
              <div className="w-16 h-16 bg-[#C08081]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-[#C08081]" />
              </div>
              <h2 className="font-serif text-lg text-[#1B4D3E] mb-2">Email Sending Not Configured</h2>
              <p className="text-sm text-[#1B4D3E]/60 mb-4">
                Password reset by email is currently unavailable.
              </p>
              <p className="text-sm text-[#1B4D3E]/60 mb-4">
                Please change your password from <strong>Account Settings</strong> once logged in.
              </p>
              <p className="text-xs text-[#1B4D3E]/50 mb-6">
                To enable email resets, add your <strong>RESEND_API_KEY</strong> to the backend environment.
              </p>
              <button
                onClick={() => setSent(false)}
                data-testid="try-again-btn"
                className="text-sm text-[#1B4D3E] underline hover:text-[#DACBA0]"
              >
                Go back
              </button>
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#DACBA0]/30 p-8 space-y-6" data-testid="forgot-password-form">
            <p className="text-sm text-[#1B4D3E]/60">
              Enter your admin email address and we'll send you a link to reset your password.
            </p>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                placeholder="your@email.com"
                required
                data-testid="forgot-email-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
              data-testid="forgot-submit-btn"
            >
              {loading ? "Sending..." : "Send Reset Link"}
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

export default AdminForgotPassword;
