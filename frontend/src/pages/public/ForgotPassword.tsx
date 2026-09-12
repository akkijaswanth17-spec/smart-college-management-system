import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, ShieldAlert } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/FormField";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { forgotPassword, resetPassword } from "../../services/auth.service";

export default function ForgotPassword() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const navigate = useNavigate();

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setDevCode(result.devCode ?? null);
      setStep("reset");
      if (result.emailSent) {
        toast.success("A reset code has been sent to your email.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, newPassword, confirmPassword);
      toast.success("Password reset successfully. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === "request") {
    return (
      <AuthLayout title="Forgot Password" subtitle="Enter your account email and we'll send you a reset code.">
        <form onSubmit={handleRequest} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
          />
          <Button type="submit" className="w-full" loading={loading}>
            <Mail className="h-4 w-4" /> Send Reset Code
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter Reset Code" subtitle={`We've sent a 6-digit code to ${email}. It expires in 10 minutes.`}>
      {devCode && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Email isn't configured yet — development mode</p>
            <p className="mt-1">
              No email was actually sent. Your code is: <span className="font-mono font-bold">{devCode}</span>
            </p>
          </div>
        </div>
      )}
      <form onSubmit={handleReset} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <Input
          label="6-Digit Code"
          required
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
        />
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Input
          label="Confirm New Password"
          type={showPassword ? "text" : "password"}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Reset Password
        </Button>
        <button
          type="button"
          onClick={() => setStep("request")}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          Use a different email
        </button>
      </form>
    </AuthLayout>
  );
}
