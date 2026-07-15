
import { getSupabaseClientOrThrow } from "./_shared";

export async function broadcastNotification(_title: string, _message: string, _type: string = "system") {
  const supabase = getSupabaseClientOrThrow();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  // Notifications table was removed in current schema.
  // Stubbing this function to return success.
  return true;
}

