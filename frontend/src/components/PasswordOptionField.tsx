import { useState } from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { Input } from "./ui/FormField";
import { generatePassword } from "../utils/password";

/** Lets an admin either auto-generate a temporary password (default) or set one directly. */
export function PasswordOptionField({
  value,
  onChange,
  manual,
  onManualChange,
}: {
  value: string;
  onChange: (v: string) => void;
  manual: boolean;
  onManualChange: (v: boolean) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => onManualChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Set the password myself
      </label>
      {manual ? (
        <div className="relative">
          <Input
            label="Password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-10 top-9 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onChange(generatePassword())}
            className="absolute right-3 top-9 text-slate-400 hover:text-brand-600"
            title="Generate a random password"
            tabIndex={-1}
          >
            <Wand2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">A secure temporary password will be generated automatically.</p>
      )}
    </div>
  );
}
