import { Trophy, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useCertificates } from "@/hooks/student/useCertificates";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { certificateViewRoute } from "@/lib/routes";

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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : certificatesData?.data && certificatesData.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {certificatesData.data.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between gap-5 rounded-2xl border border-border p-5">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Trophy className="size-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{cert.courses?.title}</h3>
                    <p className="text-sm text-muted-foreground">Issued: {new Date(cert.created_at || "").toLocaleDateString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">ID: {cert.certificate_number}</p>
                  </div>
                </div>
                <Link
                  to={certificateViewRoute(cert.id)}
                  aria-label={`View and print certificate for ${cert.courses?.title ?? "this course"}`}
                  className="flex shrink-0 items-center justify-center rounded-xl bg-muted p-3 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Eye className="size-5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No certificates yet"
            message="Complete a course to earn your first certificate."
            icon={<Trophy className="size-10" aria-hidden="true" />}
          />
        )}
      </div>
    </div>
  );
}
