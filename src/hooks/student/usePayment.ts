import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/payment.service';
import type { CheckoutOptions } from '@/services/payment.service';

export const useCheckout = () => {
  return useMutation({
    mutationFn: (options: CheckoutOptions) => {
      return paymentService.processCheckout(options);
    }
  });
};

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const res = await paymentService.getOrders({}); if (!res.success) throw res.error; return res.data; },
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => { const res = await paymentService.getOrder(orderId); if (!res.success) throw res.error; return res.data; },
    enabled: !!orderId,
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => { const res = await paymentService.getPayments({}); if (!res.success) throw res.error; return res.data; },
  });
};

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => { const res = await paymentService.getInvoice(invoiceId); if (!res.success) throw res.error; return res.data; },
    enabled: !!invoiceId,
  });
};
