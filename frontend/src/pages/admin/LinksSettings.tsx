import { useEffect, useState, FormEvent } from "react";
import { CreditCard, GraduationCap, Save, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Input } from "../../components/ui/FormField";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { settingsService } from "../../services/settings.service";

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function LinkPanel({
  icon: Icon,
  iconTone,
  title,
  url,
  onUrlChange,
  onSave,
  saving,
  saved,
  placeholder,
}: {
  icon: typeof CreditCard;
  iconTone: string;
  title: string;
  url: string;
  onUrlChange: (v: string) => void;
  onSave: (e: FormEvent) => void;
  saving: boolean;
  saved: boolean;
  placeholder: string;
}) {
  const domain = domainOf(url);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconTone}`} />
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Browser-chrome style live preview of the configured link */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="ml-2 flex flex-1 items-center gap-1.5 truncate rounded-md bg-white px-2.5 py-1 text-xs text-slate-500">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${domain ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="truncate">{domain ?? "Not configured yet"}</span>
            </div>
          </div>
          <div className="flex items-center justify-center bg-slate-50 py-6 text-slate-300">
            <Icon className="h-8 w-8" />
          </div>
        </div>

        <form onSubmit={onSave} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input label="Official URL" type="url" required value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder={placeholder} />
          </div>
          <a
            href={domain ? url : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!domain}
            className={!domain ? "pointer-events-none" : undefined}
          >
            <Button type="button" variant="outline" disabled={!domain} title="Open in a new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button type="submit" loading={saving} success={saved} successLabel="Saved">
            <Save className="h-4 w-4" /> Save
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default function AdminLinksSettings() {
  const [feeUrl, setFeeUrl] = useState("");
  const [resultsUrl, setResultsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([settingsService.getFeeLink(), settingsService.getResultsLink()])
      .then(([fee, results]) => {
        setFeeUrl(fee ?? "");
        setResultsUrl(results ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveFee(e: FormEvent) {
    e.preventDefault();
    setSavingFee(true);
    try {
      await settingsService.updateFeeLink(feeUrl);
      toast.success("Fee payment link updated");
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 1800);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingFee(false);
    }
  }

  async function saveResults(e: FormEvent) {
    e.preventDefault();
    setSavingResults(true);
    try {
      await settingsService.updateResultsLink(resultsUrl);
      toast.success("Results link updated");
      setResultsSaved(true);
      setTimeout(() => setResultsSaved(false), 1800);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingResults(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Links &amp; Settings</h1>
        <p className="text-sm text-slate-500">Configure the official fee payment and results portal URLs.</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <StaggerContainer className="space-y-6">
          <StaggerItem>
            <LinkPanel
              icon={CreditCard}
              iconTone="text-gold-600"
              title="Fee Payment Link"
              url={feeUrl}
              onUrlChange={setFeeUrl}
              onSave={saveFee}
              saving={savingFee}
              saved={feeSaved}
              placeholder="https://college-fees.example.edu/pay"
            />
          </StaggerItem>

          <StaggerItem>
            <LinkPanel
              icon={GraduationCap}
              iconTone="text-brand-600"
              title="Results Link"
              url={resultsUrl}
              onUrlChange={setResultsUrl}
              onSave={saveResults}
              saving={savingResults}
              saved={resultsSaved}
              placeholder="https://college-results.example.edu"
            />
          </StaggerItem>
        </StaggerContainer>
      )}
    </div>
  );
}
