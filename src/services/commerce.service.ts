import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import { getExtendedSupabaseClient } from "./_shared";

export class CommerceService {
  
  // ==========================================
  // Cart Operations
  // ==========================================

  async getCart(userId: string): Promise<Result<Record<string, unknown>[]>> {
    const supabase = getExtendedSupabaseClient();
    const { data, error } = await supabase
      .from('cart')
      .select('*, courses(*)')
      .eq('user_id', userId);
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(data || []);
  }

  async addToCart(userId: string, courseId: string): Promise<Result<void>> {
    const supabase = getExtendedSupabaseClient();
    const { error } = await supabase
      .from('cart')
      .insert({ user_id: userId, course_id: courseId });
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }

  async removeFromCart(userId: string, courseId: string): Promise<Result<void>> {
    const supabase = getExtendedSupabaseClient();
    const { error } = await supabase
      .from('cart')
      .delete()
      .match({ user_id: userId, course_id: courseId });
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }

  async clearCart(userId: string): Promise<Result<void>> {
    const supabase = getExtendedSupabaseClient();
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId);
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }

  // ==========================================
  // Wishlist Operations
  // ==========================================

  async getWishlist(userId: string): Promise<Result<Record<string, unknown>[]>> {
    const supabase = getExtendedSupabaseClient();
    const { data, error } = await supabase
      .from('wishlists')
      .select('*, courses(*)')
      .eq('user_id', userId);
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(data || []);
  }

  async addToWishlist(userId: string, courseId: string): Promise<Result<void>> {
    const supabase = getExtendedSupabaseClient();
    const { error } = await supabase
      .from('wishlists')
      .insert({ user_id: userId, course_id: courseId });
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }

  async removeFromWishlist(userId: string, courseId: string): Promise<Result<void>> {
    const supabase = getExtendedSupabaseClient();
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .match({ user_id: userId, course_id: courseId });
      
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }
}

export const commerceService = new CommerceService();
