<!-- /**
 * Intro Video Component
 *
 * Displays the intro video background with optimized performance:
 * - Slower playback rate for reduced CPU usage
 * - 7.5 fps rendering for better performance
 * - Loading states and error handling
 */ -->

<script lang="ts">
  import { browser } from "$app/environment";

  interface Props {
    videoError?: boolean;
  }

  let { videoError = $bindable(false) }: Props = $props();

  // State management using Svelte 5 runes
  let videoElement = $state<HTMLVideoElement>();
  let videoLoading = $state(true);  // Video loading handlers
  function handleVideoCanPlay() {
    videoLoading = false;
    videoError = false;

    // Set slower playback rate for performance and 7.5 fps effect
    if (videoElement) {
      videoElement.playbackRate = 0.25; // Quarter speed = ~7.5 fps if original is 30 fps
    }
  }

  function handleVideoError() {
    videoLoading = false;
    videoError = true;
    console.error("Video failed to load");
  }

  // Ensure video plays when component mounts
  $effect(() => {
    if (browser && videoElement && !videoLoading && !videoError) {
      videoElement.play().catch((error) => {
        console.warn("Video autoplay failed:", error);
      });
    }
  });
</script>

<!-- Video background container -->
{#if !videoError}
  <div class="relative z-0 h-[50vh] w-full overflow-hidden lg:h-full">
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="relative h-[98%] w-[98%] overflow-hidden rounded-lg">
        <!-- Loading skeleton -->
        {#if videoLoading}
          <div
            class="bg-muted absolute inset-0 flex animate-pulse items-center justify-center rounded-lg"
          >
            <div class="text-muted-foreground text-sm">Loading video...</div>
          </div>
        {/if}

        <!-- Video element with optimized settings -->
        <video
          bind:this={videoElement}
          src="/intro_twilight_xs.mp4"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
          oncanplay={handleVideoCanPlay}
          onerror={handleVideoError}
          class="pointer-events-none -z-10 h-full w-full object-cover opacity-95 transition-opacity duration-300"
          class:opacity-0={videoLoading}
          aria-label="Habistat introduction video background"
        ></video>
      </div>
    </div>
  </div>
{/if}