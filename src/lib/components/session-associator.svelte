<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { get, type Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";
  import { sessionStore, markSessionAssociated, type UserSession } from "$lib/utils/tracking";

  // Props REMOVED
  // let { trackingInitialized } = $props<{ trackingInitialized: boolean }>();

  // Get user store from context
  const userStore = getContext<Readable<UserResource | null>>("clerk-user");

  // Use $effect.pre to react to changes potentially before render
  // $effect.pre(() => {
  //   // Depend on both user and session stores reactively.
  //   const userData = $userStore;
  //   const currentSession = $sessionStore; // Use reactive store value
  //
  //   const sessionState = currentSession?.state ?? "unknown";
  //   const currentSessionId = currentSession?.id ?? null;
  //
  //   console.log(
  //     `[SessionAssociator Effect.pre Run] User: ${userData ? userData.id : "null"}, Session State: ${sessionState}`
  //   );
  //
  //   // Core logic: Associate only when user exists and session is anonymous
  //   if (userData?.id && currentSession && sessionState === "anonymous") {
  //     console.log(
  //       `[SessionAssociator Effect.pre Action] Conditions met (User: ${userData.id}, Session: ${sessionState}). Calling markSessionAssociated for session ${currentSessionId}`
  //     );
  //     markSessionAssociated(userData.id, userData.primaryEmailAddress?.emailAddress);
  //   } else {
  //     // Log skip reasons if conditions aren't met
  //     let skipReason = [];
  //     if (!userData?.id) skipReason.push("User not logged in");
  //     if (!currentSession) skipReason.push("Session is null");
  //     else if (sessionState !== "anonymous") skipReason.push(`Session state is '${sessionState}'`);
  //     // Only log if there's an actual reason to skip
  //     if (skipReason.length > 0 && !(userData?.id && sessionState === "associated")) {
  //       console.log(`[SessionAssociator Effect.pre Skip] Reason(s): ${skipReason.join(", ")}`);
  //     }
  //   }
  // });

  // console.log("[SessionAssociator] Logic disabled. Association check moved to dashboard page.");
</script>

<!-- This component renders nothing -->
