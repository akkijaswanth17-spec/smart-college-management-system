import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui/Button";

/** A single ID input + Search button, shared by every report type's lookup form. */
export function ReportSearch({
  label,
  placeholder,
  onSearch,
  loading,
}: {
  label: string;
  placeholder: string;
  onSearch: (value: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError("Please enter a valid ID.");
      return;
    }
    setValidationError("");
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <label className="block text-sm font-medium text-brand-900">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (validationError) setValidationError("");
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-brand-950 placeholder:text-slate-400 transition-shadow focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
        <Button type="submit" loading={loading} className="sm:w-auto">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>
      {validationError && <p className="text-xs font-medium text-red-600">{validationError}</p>}
    </form>
  );
}
