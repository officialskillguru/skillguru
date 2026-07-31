import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck, Search } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCertificateVerification } from "@/hooks/student/useCertificates";
import { PageLoader } from "@/components/common/PageLoader";

export default function VerifyCertificatePage() {
  const { code: codeParam } = useParams<{ code: string }>();
  const [codeInput, setCodeInput] = useState(codeParam ?? "");
  const [submittedCode, setSubmittedCode] = useState(codeParam ?? "");

  usePageMeta("Verify Certificate");

  const { data: certificate, isLoading, error } = useCertificateVerification(submittedCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedCode(codeInput.trim().toUpperCase());
  };

  return (
    <main className="page-shell flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <ShieldCheck className="mx-auto size-12 text-secondary" />
          <h1 className="mt-4 text-3xl font-black text-primary">Verify a Certificate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the verification code printed on a SkillGuru certificate to confirm it&apos;s authentic.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. 1CDADF411900"
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-mono font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground hover:bg-primary/90"
          >
            <Search className="size-4" />
            Verify
          </button>
        </form>

        {isLoading && <div className="mt-8"><PageLoader /></div>}

        {!isLoading && submittedCode && (
          error || !certificate ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-900/10">
              <XCircle className="size-10 text-red-500" />
              <p className="font-black text-red-700 dark:text-red-300">Certificate Not Found</p>
              <p className="text-sm text-red-600/80 dark:text-red-300/70">
                No certificate matches this verification code. Please check for typos.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/40 dark:bg-emerald-900/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-10 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-black text-emerald-700 dark:text-emerald-300">Certificate Verified</p>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-300/70">This is an authentic SkillGuru certificate.</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 border-t border-emerald-200/60 pt-4 text-sm dark:border-emerald-900/40 sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-muted-foreground">Awarded To</dt>
                  <dd className="font-black text-foreground">{certificate.student?.full_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted-foreground">Course</dt>
                  <dd className="font-black text-foreground">{certificate.course?.title ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted-foreground">Certificate #</dt>
                  <dd className="font-mono font-black text-foreground">{certificate.certificate_number}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted-foreground">Issued</dt>
                  <dd className="font-black text-foreground">
                    {new Date(certificate.issued_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                  </dd>
                </div>
              </dl>
            </div>
          )
        )}
      </div>
    </main>
  );
}
