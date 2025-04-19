<!-- PWA Install Prompt Component -->
<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let deferredPrompt: any;
  let showInstallButton = false;

  onMount(() => {
    if (!browser) return;

    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("'beforeinstallprompt' event fired!");
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
    });
  });

  async function installPWA() {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the PWA installation");
    } else {
      console.log("User declined the PWA installation");
    }

    // Clear the deferredPrompt
    deferredPrompt = null;
    showInstallButton = false;
  }
</script>

{#if showInstallButton}
  <button
    on:click={installPWA}
    class="bg-primary text-primary-foreground fixed right-4 bottom-4 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      />
      <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
      <polyline points="7.5 19.79 7.5 14.6 3 12" />
      <polyline points="21 12 16.5 14.6 16.5 19.79" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
    Install Habistat App
  </button>
{/if}
