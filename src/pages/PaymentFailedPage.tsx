import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/hooks/usePageMeta';
import { GsapReveal } from '@/components/motion/gsap-reveal';

export default function PaymentFailedPage() {
  usePageMeta('Payment Failed | SkillGuru');
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'The transaction could not be completed.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <GsapReveal className="w-full max-w-md overflow-hidden rounded-3xl bg-card p-8 shadow-2xl text-center border border-border">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-black text-primary">Payment Failed</h1>
        <p className="mt-3 text-muted-foreground">
          {reason}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No charges were made to your account.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to={routes.courses}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-colors hover:bg-opacity-90"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </Link>
          
          <Link
            to={routes.home}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-bold text-primary transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </GsapReveal>
    </main>
  );
}
