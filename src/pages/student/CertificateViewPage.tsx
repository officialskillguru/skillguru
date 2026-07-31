import { useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Printer } from "lucide-react";
import { useCertificateDetails } from "@/hooks/student/useCertificates";
import { PageLoader } from "@/components/common/PageLoader";
import { ErrorState } from "@/components/common/ErrorState";
import { routes, verifyCertificateRoute } from "@/lib/routes";

function renderTemplate(html: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    html
  );
}

export default function CertificateViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: certificate, isLoading, error } = useCertificateDetails(id);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const renderedHtml = useMemo(() => {
    if (!certificate?.template) return null;
    return renderTemplate(certificate.template.html_template, {
      studentName: certificate.student?.full_name ?? "Student",
      courseName: certificate.course?.title ?? "Course",
      issueDate: new Date(certificate.issued_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
      certificateNumber: certificate.certificate_number,
    });
  }, [certificate]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  if (isLoading) return <PageLoader />;
  if (error || !certificate) return <div className="p-8"><ErrorState title="Certificate not found" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={routes.dashboard + "/certificates"}
          className="flex items-center gap-1 rounded text-sm font-bold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to Certificates
        </Link>
        <button
          onClick={handlePrint}
          disabled={!renderedHtml}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print / Save as PDF
        </button>
      </div>

      {renderedHtml ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-muted/30 p-4">
          <iframe
            ref={iframeRef}
            title={`Certificate ${certificate.certificate_number}`}
            srcDoc={renderedHtml}
            className="mx-auto block aspect-[297/210] w-full max-w-4xl rounded-lg bg-white shadow-lg"
          />
        </div>
      ) : (
        <ErrorState title="No certificate template available" message="Please contact support." />
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>
          Verification code: <span className="font-mono font-bold text-foreground">{certificate.verification_code}</span>
        </p>
        <Link to={verifyCertificateRoute(certificate.verification_code)} className="mt-1 inline-block font-bold text-primary hover:underline">
          View public verification page
        </Link>
      </div>
    </div>
  );
}
