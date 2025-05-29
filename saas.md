# **Habistat - SaaS Implementation Plan**

This plan revises the project's trajectory to build a Software as a Service (SaaS) model with free and premium tiers. It integrates subscription-aware logic throughout the application, from the database schema to the user interface.

### **Phase 1: Core App with Subscription-Aware Backend**

**Goal**: Update the backend schema and create the foundational server logic to support user subscriptions and entitlements.

**Tasks**:

- **1.1. Update Convex Schema (`convex/schema.ts`):**
    - [ ] Modify the `users` table to include subscription details.
        
        TypeScript
        
        ```
        // in convex/schema.ts
        users: defineTable({
          // ... existing fields: clerkId, email, name, avatarUrl
          subscriptionId: v.optional(v.string()), // To store Stripe Subscription ID
          subscriptionTier: v.optional(v.union(
            v.literal("free"),
            v.literal("premium_monthly"),
            v.literal("premium_lifetime")
          )),
          subscriptionExpiresAt: v.optional(v.number()), // Timestamp for expiration
        })
        .index("by_clerk_id", ["clerkId"])
        .index("by_subscription_id", ["subscriptionId"]), // Index for Stripe webhooks
        ```
        
- **1.2. Create Convex Subscription Functions (`convex/users.ts`):**
    - [ ] Create a query to get the current user's data, including their subscription status.
        
        TypeScript
        
        ```
        // in convex/users.ts
        export const getCurrentUser = query({
          handler: async (ctx) => {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
              return null;
            }
            return await ctx.db
              .query("users")
              .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
              .unique();
          },
        });
        ```
        
    - [ ] Create an internal mutation to be called by webhooks later to update a user's subscription.
        
        TypeScript
        
        ```
        // in convex/users.ts
        export const updateSubscription = internalMutation({
          args: {
            clerkId: v.string(),
            subscriptionId: v.string(),
            tier: v.union(v.literal("premium_monthly"), v.literal("premium_lifetime")),
            expiresAt: v.optional(v.number()),
          },
          handler: async (ctx, { clerkId, subscriptionId, tier, expiresAt }) => {
            const user = await ctx.db
              .query("users")
              .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
              .unique();
        
            if (!user) {
              throw new Error("User not found");
            }
        
            await ctx.db.patch(user._id, {
              subscriptionId: subscriptionId,
              subscriptionTier: tier,
              subscriptionExpiresAt: expiresAt,
            });
          },
        });
        ```
        

### **Phase 2: Frontend Entitlement Logic & UI Limits**

**Goal**: Make the SvelteKit frontend aware of the user's subscription status and enforce the free tier limitations (3 calendars, 3 habits per calendar).

**Tasks**:

- **2.1. Create a Subscription Store (`src/lib/stores/subscription.ts`):**
    - [ ] Create a `writable` Svelte store that holds the user's subscription status (`tier`, `expiresAt`, `isActive`).
    - [ ] Populate this store by calling the `getCurrentUser` Convex query when the application loads for an authenticated user.
- **2.2. Implement UI Logic for Limits:**
    - [ ] In components for creating calendars and habits, check the current number of items against the limits defined by the subscription store.
    - [ ] If the user is on the "free" tier and has reached the limit (3 calendars or 9 total habits), disable the "Create New" buttons.
    - [ ] When the "Create" button is disabled, show a tooltip or a small message prompting the user to upgrade to premium for unlimited items.
- **2.3. Implement Subscription Expiration UI:**
    - [ ] In the `HabitListItem` component, add logic to check if a habit is "disabled".
    - [ ] A habit is considered disabled if the user's subscription has expired (`subscription.isActive` is false) AND the habit's index is greater than the free limit (e.g., it's the 10th habit or more).
    - [ ] Apply a "grayscale" CSS filter and reduced opacity to disabled habits.
    - [ ] For disabled habits, the "Complete" button should be hidden or disabled. The "Edit" and "Delete" buttons should remain active.

### **Phase 3: Premium Onboarding & User Experience**

**Goal**: Create clear pathways for users to understand the premium offering and their current status, guiding them towards a future upgrade path.

**Tasks**:

- **3.1. Create a Premium/Pricing Page (`src/routes/premium/+page.svelte`):**
    - [ ] Design a page that clearly lists the benefits of the premium subscription (e.g., up to 30 habits, more calendars, support development).
    - [ ] Add placeholder "Upgrade to Monthly" and "Upgrade to Lifetime" buttons. These will later be wired up to Stripe.
- **3.2. Update Settings Page (`/settings/account`):**
    - [ ] Display the user's current subscription tier (e.g., "Plan: Free" or "Plan: Premium Lifetime").
    - [ ] If the plan is `premium_monthly`, show the `subscriptionExpiresAt` date.
    - [ ] Add a "Manage Subscription" button (which will later link to the Stripe customer portal) and an "Upgrade" button that links to the `/premium` page.
- **3.3. Anonymous User to Subscriber Flow:**
    - [ ] When an anonymous user with local data signs up, their data should be migrated as planned.
    - [ ] The user will start on the "free" tier by default. If their migrated local data exceeds the free tier limits, immediately apply the "disabled" state to the excess items and present a one-time modal explaining the situation and prompting them to upgrade.

### **Phase 4: Stripe Integration & Webhooks**

**Goal**: Connect the application to Stripe to handle payments and automatically update user subscription statuses.

**Tasks**:

- **4.1. Set up Stripe Products & Prices:**
    - [ ] In the Stripe Dashboard, create two products: "Habistat Premium (Monthly)" and "Habistat Premium (Lifetime)".
    - [ ] Assign corresponding prices to each product.
- **4.2. Implement Stripe Checkout (`convex/http.ts` & `/premium` page):**
    - [ ] Create a new Convex action (e.g., `createStripeCheckout`) that uses the Stripe Node.js library to create a Checkout Session. This action will take the user's `clerkId` and the desired `priceId` as arguments.
    - [ ] Wire up the "Upgrade" buttons on the `/premium` page to call this action. On success, redirect the user to the Stripe Checkout URL returned by the action.
- **4.3. Implement Stripe Webhook Handler (`convex/http.ts`):**
    - [ ] Create a new HTTP action in Convex to serve as the endpoint for Stripe webhooks.
    - [ ] Secure this endpoint by verifying the Stripe signature.
    - [ ] Handle the `checkout.session.completed` event:
        - Extract the `subscriptionId` and `clerkId` (passed as metadata).
        - Determine the tier and expiration date from the Stripe session.
        - Call the `internal.users.updateSubscription` mutation to update the user's status in the Convex database.
    - [ ] Handle other relevant events like `customer.subscription.updated` and `customer.subscription.deleted` to manage subscription changes and cancellations.
- **4.4. Implement Customer Portal (`convex/users.ts` & `/settings/account`):**
    - [ ] Create a Convex action that generates a Stripe Billing Portal session for a given user.
    - [ ] Connect the "Manage Subscription" button in the settings to call this action and redirect the user to the portal.

By following this revised plan, you can successfully pivot Habistat into a SaaS model with a clear distinction between free and premium features, all built on a robust and scalable tech stack.