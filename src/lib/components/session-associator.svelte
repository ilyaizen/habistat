<script lang="ts">
  import { getContext } from "svelte";
  import { get, type Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";
  import { sessionStore, markSessionAssociated, type UserSession } from "$lib/utils/tracking";

  // Props REMOVED
  // let { trackingInitialized } = $props<{ trackingInitialized: boolean }>();

  // Get user store from context
  const userStore = getContext<Readable<UserResource | null>>("clerk-user");

  // Effect to handle session association
  $effect(() => {
    // trackingInitialized is implicitly true because this component only renders when it is.
    // Depend on both user and session stores reactively.
    const userData = $userStore;
    const currentSession = $sessionStore; // Use reactive store value

    // Get current session details non-reactively only when needed
    const sessionState = currentSession?.state ?? "unknown";
    const currentSessionId = currentSession?.id ?? null;

    // No need to check isTrackingReady here anymore

    console.log(
      `[SessionAssociator Effect Run] User: ${userData ? userData.id : "null"}, Session State: ${sessionState}`
    );

    // Core logic: Associate only when user exists and session is anonymous
    if (userData?.id && currentSession && sessionState === "anonymous") {
      console.log(
        `[SessionAssociator Effect Action] Conditions met (User: ${userData.id}, Session: ${sessionState}). Calling markSessionAssociated for session ${currentSessionId}`
      );
      markSessionAssociated(userData.id, userData.primaryEmailAddress?.emailAddress);
    } else {
      // Log skip reasons if conditions aren't met
      let skipReason = [];
      // Removed tracking check
      if (!userData?.id) skipReason.push("User not logged in");
      // Check if session is null OR not anonymous
      if (!currentSession) skipReason.push("Session is null");
      else if (sessionState !== "anonymous") skipReason.push(`Session state is '${sessionState}'`);
      // Only log if there's an actual reason to skip
      if (skipReason.length > 0 && !(userData?.id && sessionState === "associated")) {
        console.log(`[SessionAssociator Effect Skip] Reason(s): ${skipReason.join(", ")}`);
      }
    }
  });
</script>

<!-- This component renders nothing -->
