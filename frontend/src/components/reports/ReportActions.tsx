import { Eye, FileDown, Printer } from "lucide-react";
import { Button } from "../ui/Button";

/** The Preview / Download PDF / Print row shown under every successful report search. */
export function ReportActions({
  onPreview,
  onDownload,
  onPrint,
  downloading,
}: {
  onPreview: () => void;
  onDownload: () => void;
  onPrint: () => void;
  downloading: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onPreview}>
        <Eye className="h-3.5 w-3.5" /> Preview Report
      </Button>
      <Button variant="outline" size="sm" onClick={onDownload} loading={downloading}>
        <FileDown className="h-3.5 w-3.5" /> Download PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Printer className="h-3.5 w-3.5" /> Print Report
      </Button>
    </div>
  );
}
