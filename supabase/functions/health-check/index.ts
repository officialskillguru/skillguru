import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Using service role to execute admin-level check
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call our SQL verification function
    const { data, error } = await supabase.rpc('verify_auth_setup')

    if (error) {
      throw error
    }

    // Verify all checks passed
    const isHealthy = 
      data.trigger_exists && 
      data.function_exists && 
      data.foreign_key_exists && 
      !data.has_orphaned_users && 
      !data.has_duplicate_uuids

    if (!isHealthy) {
      return new Response(
        JSON.stringify({ 
          status: 'UNHEALTHY', 
          diagnostic: 'Database validation failed', 
          details: data 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ status: 'OK', message: 'Database health verified.', details: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ status: 'ERROR', diagnostic: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
