import { createClient } from "@supabase/supabase-js";

interface CreateOrderRequest {
  course_ids: string[];
}

interface CourseItem {
  id: string;
  price: number | null;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  [key: string]: unknown;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Edge function environment is not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const body = (await request.json()) as CreateOrderRequest;
    const { course_ids } = body;

    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return jsonResponse({ error: "Invalid course IDs." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch courses and validate
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, price")
      .in("id", course_ids);

    if (coursesError || !courses || courses.length !== course_ids.length) {
      return jsonResponse({ error: "One or more courses not found." }, 404);
    }

    const totalAmount = (courses as CourseItem[]).reduce((sum: number, course: CourseItem) => sum + (course.price || 0), 0);

    // Create Supabase order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        status: "created"
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error("Failed to create order.");
    }

    // Create Supabase order_items
    const orderItems = (courses as CourseItem[]).map((course: CourseItem) => ({
      order_id: order.id,
      course_id: course.id,
      price: course.price || 0
    }));

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      throw orderItemsError;
    }

    // Call Razorpay API to create order
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${razorpayAuth}`
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100), // in paise
        currency: "INR",
        receipt: order.id,
        notes: {
          supabase_order_id: order.id
        }
      })
    });

    if (!rpResponse.ok) {
      const errorText = await rpResponse.text();
      console.error("Razorpay Error:", errorText);
      throw new Error("Failed to create Razorpay order.");
    }

    const rpData = (await rpResponse.json()) as RazorpayOrderResponse;

    return jsonResponse({
      order_id: order.id,
      razorpay_order_id: rpData.id,
      amount: rpData.amount,
      currency: rpData.currency,
      key_id: razorpayKeyId
    }, 200);

  } catch (error: unknown) {
    console.error("Error creating order:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
