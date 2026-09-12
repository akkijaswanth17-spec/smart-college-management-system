import { useState, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/FormField";
import { Button } from "./ui/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { Role } from "../types";

interface LoginFormProps {
  expectedRole: Role;
  dashboardPath: string;
  /** Students may sign in with either their email or their Roll Number / Student ID. */
  allowRollNumber?: boolean;
}

export function LoginForm({ expectedRole, dashboardPath, allowRollNumber }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== expectedRole) {
        await logout();
        setError(`This sign-in page is for ${expectedRole.toLowerCase()} accounts only.`);
        return;
      }
      toast.success(`Welcome back, ${user.email}`);
      const fromState = location.state as { from?: { pathname?: string } } | null;
      const redirectTo = fromState?.from?.pathname ?? dashboardPath;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <Input
        label={allowRollNumber ? "Email or Roll Number" : "Email address"}
        type={allowRollNumber ? "text" : "email"}
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={allowRollNumber ? "you@college.edu or STU001" : "you@college.edu"}
      />
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
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
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-800">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Sign In
      </Button>
    </motion.form>
  );
}
