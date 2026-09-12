import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, ExternalLink } from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { settingsService } from "../../services/settings.service";

export default function StudentFees() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsService
      .getFeeLink()
      .then(setUrl)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardBody className="flex flex-col items-center py-12 text-center">
          {loading ? (
            <>
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="mt-6 h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
              <Skeleton className="mt-6 h-11 w-32 rounded-lg" />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
                {url && (
                  <motion.span
                    className="absolute inset-0 rounded-2xl bg-gold-300/40"
                    animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <CreditCard className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-xl font-bold text-slate-900">Pay Your College Fees</h1>
              <p className="mt-2 text-sm text-slate-500">
                You'll be redirected to the college's official, secure fee payment portal.
              </p>
              <Button
                className="mt-6"
                size="lg"
                disabled={!url}
                onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
              >
                Pay Fees <ExternalLink className="h-4 w-4" />
              </Button>
              {!url && (
                <p className="mt-4 text-xs text-slate-400">The fee payment link hasn't been configured yet. Please check back later.</p>
              )}
            </motion.div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
