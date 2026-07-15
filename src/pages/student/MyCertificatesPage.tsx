import { Trophy, Download } from "lucide-react";
import { useCertificates } from "@/hooks/student/useCertificates";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";

export default function MyCertificatesPage() {
  const { data: certificatesData, isLoading, error } = useCertificates(1, 10);

  if (error) {
    return <ErrorState title="Failed to load certificates" message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">My Certificates</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : certificatesData?.data && certificatesData.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {certificatesData.data.map((cert) => (
              <div key={cert.id} className="flex gap-5 rounded-2xl border border-slate-200 p-5 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Trophy className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{cert.courses?.title}</h3>
                    <p className="text-sm text-muted-foreground">Issued: {new Date(cert.created_at || "").toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400 mt-1">ID: {cert.certificate_number}</p>
                  </div>
                </div>
                {cert.certificate_file_id && (
                  <a
                    href={cert.certificate_file_id}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center justify-center rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
                    title="Download PDF"
                  >
                    <Download className="size-5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No certificates yet"
            message="Complete a course to earn your first certificate."
            icon={<Trophy className="size-10" />}
          />
        )}
      </div>
    </div>
  );
}
