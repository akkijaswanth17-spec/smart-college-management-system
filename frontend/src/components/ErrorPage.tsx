import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

export function ErrorPage({
  code,
  icon: Icon,
  title,
  description,
}: {
  code: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Logo />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <Icon className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-red-500">Error {code}</p>
      <h1 className="mt-2 font-serif text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
