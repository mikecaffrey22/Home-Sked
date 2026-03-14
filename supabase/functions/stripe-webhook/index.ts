// supabase/functions/stripe-webhook/index.ts
// ============================================================
// HomeSked: Stripe Webhook → Supabase Tier Enforcement
// Supports 3 tiers: free, landlord ($10/mo), pro ($50/mo)
//
// SETUP:
// 1. Install Supabase CLI: scoop install supabase (Windows)
// 2. Link project: supabase link --project-ref YOUR_PROJECT_REF
// 3. Set secrets:
//    supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
//    supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
// 4. Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// 5. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//    URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
//    Events: checkout.session.completed, customer.subscription.updated,
//            customer.subscription.deleted, invoice.payment_failed
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Determine tier from subscription price amount (in cents)
// $50/mo (5000 cents) = pro, $10/mo (1000 cents) = landlord
function getTierFromSubscription(subscription: Stripe.Subscription): string {
  const items = subscription.items?.data || [];
  if (items.length === 0) return "landlord";
  const amount = items[0]?.price?.unit_amount || 0;
  if (amount >= 4000) return "pro";
  if (amount >= 500) return "landlord";
  return "landlord";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("No client_reference_id in checkout session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        });
        const tier = getTierFromSubscription(subscription);

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: "id" });

        if (error) console.error("Error updating subscription:", error);
        else console.log(`Activated ${tier} tier for user ${userId}`);

        // Auto-create pro_profiles row for pro tier
        if (tier === "pro") {
          await supabaseAdmin
            .from("pro_profiles")
            .upsert({ id: userId }, { onConflict: "id" });
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!sub) {
          console.error("No user found for customer:", customerId);
          break;
        }

        const isActive = ["active", "trialing"].includes(subscription.status);
        let tier = "free";
        if (isActive) {
          const fullSub = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ["items.data.price"],
          });
          tier = getTierFromSubscription(fullSub);
        }

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            tier,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("id", sub.id);

        if (error) console.error("Error updating subscription:", error);
        else console.log(`Updated user ${sub.id}: tier=${tier}, status=${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!sub) {
          console.error("No user found for customer:", customerId);
          break;
        }

        await supabaseAdmin
          .from("subscriptions")
          .update({ tier: "free", status: "canceled", cancel_at_period_end: false })
          .eq("id", sub.id);

        console.log(`Downgraded user ${sub.id} to free`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (sub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("id", sub.id);
          console.log(`Marked user ${sub.id} as past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
