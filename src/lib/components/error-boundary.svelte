<!-- Error Boundary Component for Tauri Webview Debugging -->
<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { isTauriWebview } from "$lib/utils/tauri-debug";

  interface Props {
    children: any;
  }

  let { children }: Props = $props();
  let hasError = $state(false);
  let errorInfo = $state<string>("");

  onMount(() => {
    if (browser) {
      // Global error handler for unhandled promise rejections
      window.addEventListener("unhandledrejection", (event) => {
        console.error("🚨 Unhandled Promise Rejection:", event.reason);
        if (isTauriWebview()) {
          hasError = true;
          errorInfo = `Unhandled Promise Rejection: ${event.reason}`;
        }
        // Prevent the default browser behavior
        event.preventDefault();
      });

      // Global error handler for JavaScript errors
      window.addEventListener("error", (event) => {
        console.error("🚨 JavaScript Error:", event.error);
        if (isTauriWebview()) {
          hasError = true;
          errorInfo = `JavaScript Error: ${event.error?.message || event.error}`;
        }
      });

      // Check if we're in Tauri and log environment info
      if (isTauriWebview()) {
        console.log("🔍 Running in Tauri webview - Enhanced error monitoring active");
      }
    }
  });

  // Simple error boundary logic using reactive statements
  $effect(() => {
    try {
      // Monitor for render errors by checking if children renders
      if (children && typeof children === "function") {
        children();
      }
    } catch (error) {
      console.error("🚨 Render Error in Error Boundary:", error);
      hasError = true;
      errorInfo = `Render Error: ${error}`;
    }
  });
</script>

{#if hasError}
  <div class="error-boundary">
    <div class="error-content">
      <h1>🚨 Application Error</h1>
      <p>Something went wrong in the Tauri webview.</p>
      <details>
        <summary>Error Details</summary>
        <pre>{errorInfo}</pre>
      </details>
      <button
        onclick={() => {
          hasError = false;
          errorInfo = "";
          location.reload();
        }}
        class="retry-button"
      >
        Reload App
      </button>
    </div>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: #f8f9fa;
  }

  .error-content {
    max-width: 500px;
    text-align: center;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .error-content h1 {
    color: #dc3545;
    margin-bottom: 1rem;
  }

  .error-content details {
    margin: 1rem 0;
    text-align: left;
  }

  .error-content pre {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
  }

  .retry-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .retry-button:hover {
    background: #0056b3;
  }
</style>
