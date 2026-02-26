// ============================================================
// 漢字 · HSK Flashcards — create-checkout-session
//
// Creates a Stripe Checkout session for a deck purchase.
// Called by the frontend when a signed-in user clicks "Buy".
//
// Required Supabase secrets (set via CLI or dashboard):
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set APP_URL=https://royourboat1988.github.io/hsk-flashcards
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = Deno.env.get('APP_URL') ?? '';

// Map deck IDs to their Stripe Price IDs (GBP, one-time).
// Create products in the Stripe dashboard, then set secrets:
//   supabase secrets set STRIPE_PRICE_HSK3=price_...
//   supabase secrets set STRIPE_PRICE_HSK4=price_...
//   supabase secrets set STRIPE_PRICE_HSK5=price_...
//   supabase secrets set STRIPE_PRICE_HSK6=price_...
//   supabase secrets set STRIPE_PRICE_HSK_ALL=price_...
//   supabase secrets set STRIPE_PRICE_SENTENCES=price_...
const DECK_PRICE_IDS: Record<string, string> = {
  hsk4:      Deno.env.get('STRIPE_PRICE_HSK4')      ?? '',  // £2
  hsk5:      Deno.env.get('STRIPE_PRICE_HSK5')      ?? '',  // £2
  hsk:       Deno.env.get('STRIPE_PRICE_HSK_ALL')   ?? '',  // £5
  sentences: Deno.env.get('STRIPE_PRICE_SENTENCES')  ?? '',  // £2
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the user from the JWT ──────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Use service role key server-side, pass JWT directly to getUser()
    // This is the recommended pattern for Edge Functions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: authError?.message ?? 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Parse the request body ──────────────────────────────
    const { deck_id } = await req.json();
    if (!deck_id || !DECK_PRICE_IDS[deck_id]) {
      return new Response(JSON.stringify({ error: `Unknown deck: ${deck_id}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = DECK_PRICE_IDS[deck_id];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured for deck: ${deck_id}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Create the Stripe Checkout session ──────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      // Pass user_id and deck_id so the webhook can grant the entitlement
      metadata: {
        user_id: user.id,
        deck_id,
      },
      customer_email: user.email,
      success_url: `${APP_URL}?payment=success&deck=${deck_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
