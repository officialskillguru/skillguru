import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService, type PaymentVerificationResult } from '@/services/payment.service';
import { enrollInFreeCourse } from '@/services/enrollment.service';

export interface CheckoutOptions {
  courseId: string;
  userInfo?: { name?: string; email?: string; phone?: string };
  onDismiss?: () => void;
}

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    // Stub: no real invoice-amount lookup exists yet (the `invoices` table has no amount/status
    // columns - see BUG_REPORT.md). Kept deliberately inert rather than fabricating a value;
    // PaymentSuccessPage's invoice-summary block checks a shape this stub doesn't provide, so it
    // never renders.
    queryFn: () => ({ id: invoiceId, amount: 0, status: 'paid' }),
    enabled: !!invoiceId,
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: CheckoutOptions) => {
      // 1. Create the order (frontend only ever calls create-order/verify-payment -
      //    it never talks to a provider directly, see docs/PAYMENT_ARCHITECTURE.md §9/§10).
      const orderResult = await paymentService.createOrder(options.courseId);
      if (!orderResult.success) throw orderResult.error;
      const session = orderResult.data;

      // 2. Mock mode has no real checkout widget - complete verification immediately
      //    using the pre-signed pair the server handed back.
      if (session.provider === 'mock' && session.mockPayment) {
        const verifyResult = await paymentService.verifyPayment(
          session.orderId,
          session.providerOrderId,
          session.mockPayment.providerPaymentId,
          session.mockPayment.signature
        );
        if (!verifyResult.success) throw verifyResult.error;
        return verifyResult.data;
      }

      // 3. Razorpay mode - open the real checkout widget and verify against its response.
      return new Promise<PaymentVerificationResult>((resolve, reject) => {
        void paymentService.openCheckout(
          session,
          options.userInfo ?? {},
          (paymentId, providerOrderId, signature) => {
            paymentService
              .verifyPayment(session.orderId, providerOrderId, paymentId, signature)
              .then((verifyResult) => {
                if (!verifyResult.success) {
                  reject(verifyResult.error);
                  return;
                }
                resolve(verifyResult.data);
              })
              .catch(reject);
          },
          options.onDismiss
        );
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['check-enrollment-by-slug'] });
    },
  });
};

export const useFreeEnroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const result = await enrollInFreeCourse(courseId);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['check-enrollment-by-slug'] });
    },
  });
};

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await paymentService.getAdminPayments(1, 20);
      if (!res.success) throw res.error;
      return res.data;
    },
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await paymentService.getAdminPayments(1, 50);
      if (!res.success) throw res.error;
      return res.data;
    },
  });
};

export const useRevenueMetrics = () => {
  return useQuery({
    queryKey: ['revenue-metrics'],
    queryFn: async () => {
      const res = await paymentService.getRevenueMetrics();
      if (!res.success) throw res.error;
      return res.data;
    },
  });
};
