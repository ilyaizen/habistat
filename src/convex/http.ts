import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// The Clerk webhook secret, stored in an environment variable
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
console.log(`Webhook secret defined: ${!!webhookSecret}`);

/**
 * Interface for Clerk webhook event data
 */
interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      id: string;
      email_address: string;
    }>;
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

/**
 * HTTP action to handle incoming webhooks from Clerk.
 */
const handleClerkWebhook = httpAction(async (ctx, request) => {
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET environment variable not set.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get headers for Svix verification
  const headers = request.headers;
  const svix_id = headers.get("svix-id");
  const svix_timestamp = headers.get("svix-timestamp");
  const svix_signature = headers.get("svix-signature");

  // If any required header is missing, reject the request
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Get the request body
  const payload = await request.text();

  // Create a new Svix webhook instance for verification
  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    // Verify the webhook signature and parse the event payload
    event = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }) as ClerkWebhookEvent;
  } catch (err) {
    // Log the error and reject if verification fails
    console.error("Error verifying Clerk webhook:", err instanceof Error ? err.message : err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  // Extract relevant data from the event payload
  const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
  const eventType = event.type;

  console.log(`Received Clerk webhook event: ${eventType} for user ${clerkId}`);

  // Handle supported event types (user created or updated)
  if (eventType === "user.created" || eventType === "user.updated") {
    // Extract primary email address
    const primaryEmail = email_addresses?.find(
      (e) => e.id === event.data.primary_email_address_id
    )?.email_address;

    if (!primaryEmail) {
      console.warn(`Webhook received for user ${clerkId} without a primary email.`);
      return new Response("Primary email not found", { status: 400 });
    }

    try {
      // Call the internal Convex mutation to create or update the user
      await ctx.runMutation(internal.users.createOrUpdate, {
        clerkId: clerkId,
        email: primaryEmail,
        name: first_name ? `${first_name}${last_name ? ` ${last_name}` : ""}` : undefined,
        avatarUrl: image_url
      });

      console.log(`Successfully processed ${eventType} for user ${clerkId}`);
      return new Response("OK", { status: 200 });
    } catch (mutationError) {
      console.error(`Error running createOrUpdate mutation for user ${clerkId}:`, mutationError);
      return new Response("Internal server error during mutation", { status: 500 });
    }
  } else {
    // Log and ignore unsupported event types
    console.log(`Ignoring unsupported Clerk webhook event type: ${eventType}`);
    return new Response("Unsupported event type", { status: 200 });
  }
});

// Define the HTTP router
const http = httpRouter();

// Map the POST request at the /clerk endpoint to the handler function
// Ensure the path matches what you configure in the Clerk Dashboard webhook settings
http.route({
  path: "/clerk",
  method: "POST",
  handler: handleClerkWebhook
});

// Export the router
export default http;
