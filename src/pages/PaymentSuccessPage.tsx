import { CheckCircle2, ArrowRight, Download } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/hooks/usePageMeta';
import { GsapReveal } from '@/components/motion/gsap-reveal';
import { useInvoice } from '@/hooks/student/usePayment';

export default function PaymentSuccessPage() {
  usePageMeta('Payment Successful | SkillGuru');
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');

  const { data: invoiceData, isLoading } = useInvoice(invoiceId || '');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <GsapReveal className="w-full max-w-md overflow-hidden rounded-3xl bg-card p-8 shadow-2xl text-center border border-border">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-black text-primary">Payment Successful!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for your purchase. Your enrollment is now active.
        </p>

        {invoiceId && !isLoading && !!(invoiceData as { invoice?: unknown })?.invoice && (
          <div className="mt-6 rounded-xl bg-muted p-4 text-left text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Invoice No:</span>
              <p className="mt-1 text-sm font-medium text-slate-900">{(invoiceData as unknown as { invoice: { invoice_number: string } }).invoice?.invoice_number || "INV-PENDING"}</p>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-bold text-primary">₹{(invoiceData as unknown as { invoice: { amount: number } }).invoice.amount}</span>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Link
            to={routes.dashboard}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 font-bold text-white transition-colors hover:bg-opacity-90"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          
          {invoiceId && (
            <button
              onClick={() => window.print()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-bold text-primary transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Download Receipt
            </button>
          )}
        </div>
      </GsapReveal>
    </main>
  );
}
