<!-- PWA registration and installation component -->
<script lang="ts">
  import { onMount } from "svelte";

  let deferredPrompt: any;
  let showInstallButton = false;

  onMount(() => {
    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      // Show the install button
      showInstallButton = true;
    });

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      // Hide the install button
      showInstallButton = false;
      // Clear the deferredPrompt
      deferredPrompt = null;
      // Log the installation (optional)
      console.log("PWA was installed");
    });
  });

  async function installPWA() {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Log the user's choice (optional)
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    deferredPrompt = null;
    showInstallButton = false;
  }
</script>

{#if showInstallButton}
  <button
    on:click={installPWA}
    class="bg-primary text-primary-foreground fixed right-4 bottom-4 flex items-center space-x-2 rounded-full px-4 py-2 shadow-lg"
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
    <span>Install App</span>
  </button>
{/if}
