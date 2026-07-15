export interface MockPaymentRow { id: string; created_at: string; total_amount: number; status: string; }
import { type Result, fail } from "@/utils/result";
import { DatabaseError } from "@/utils/result";

export class PaymentService {
  processCheckout(_options: unknown): Promise<Result<unknown>> { return Promise.resolve(fail(new DatabaseError("disabled", "disabled"))); }
  processPayment(_orderId: string, _paymentDetails: unknown): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  createOrder(_courseId: string, _studentId: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getPaymentHistory(_studentId: string): Promise<Result<MockPaymentRow[]>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  verifyPayment(_orderId: string, _paymentId: string, _signature: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  createRazorpayOrder(_amount: number, _receipt: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getOrders(_options: unknown): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getOrder(_id: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getPayments(_options: unknown): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getInvoice(_paymentId: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  getPayment(_id: string): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
  initiatePayment(_data: unknown): Promise<Result<unknown>> {
    return Promise.resolve(fail(new DatabaseError("Commerce domain is currently disabled", "disabled")));
  }
}
export const paymentService = new PaymentService();

export interface CheckoutOptions {
  courseId: string;
  name?: string;
  email?: string;
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}
