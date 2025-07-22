// import { browser } from "$app/environment";

// /**
//  * Navigation tracking hook for Habistat application.
//  * Manages browser history state and forward/back navigation capabilities.
//  */
// export function useNavigation() {
//   let canGoForward = $state(false);
//   let navigationStack: string[] = $state([]);
//   let currentIndex = $state(0);

//   /**
//    * Updates the forward navigation state based on browser history.
//    */
//   function updateForwardState() {
//     if (!browser) return;

//     // In a real app, you'd track this more precisely
//     // For now, we'll assume forward is available only right after going back
//     // and becomes unavailable after any forward navigation
//     setTimeout(() => {
//       // Simple heuristic: if we just went back, forward might be available
//       // but after any action, we need to re-evaluate
//       // const currentUrl = window.location.href;
//       const wasForwardAvailable = canGoForward;

//       // Reset forward availability - it will be set to true only when we go back
//       if (wasForwardAvailable) {
//         // Keep it available for a short time, then re-evaluate
//         setTimeout(() => {
//           canGoForward = false;
//         }, 50);
//       }
//     }, 10);
//   }

//   /**
//    * Initializes navigation tracking and sets up event listeners.
//    */
//   function initializeNavigationTracking() {
//     if (!browser) return;

//     // Track the current page
//     navigationStack = [window.location.href];
//     currentIndex = 0;
//     canGoForward = false;

//     // Listen for popstate events (back/forward navigation)
//     window.addEventListener("popstate", () => {
//       // After a popstate, check if we can go forward
//       // This is still tricky, but we can make educated guesses
//       updateForwardState();
//     });
//   }

//   /**
//    * Navigates back in browser history.
//    */
//   function goBack() {
//     if (!browser) return;

//     console.log("Going back...");
//     window.history.back();

//     // After going back, forward should become available
//     setTimeout(() => {
//       canGoForward = true;
//       console.log("Forward is now available");
//     }, 100);
//   }

//   /**
//    * Navigates forward in browser history.
//    */
//   function goForward() {
//     if (!browser || !canGoForward) return;

//     console.log("Going forward...");
//     window.history.forward();

//     // After going forward, we might not be able to go forward again
//     setTimeout(() => {
//       canGoForward = false;
//       console.log("Forward is now disabled");
//     }, 100);
//   }

//   /**
//    * Cleanup function to remove event listeners.
//    */
//   function cleanup() {
//     if (!browser) return;
//     window.removeEventListener("popstate", updateForwardState);
//   }

//   return {
//     get canGoForward() {
//       return canGoForward;
//     },
//     get navigationStack() {
//       return navigationStack;
//     },
//     get currentIndex() {
//       return currentIndex;
//     },
//     initializeNavigationTracking,
//     goBack,
//     goForward,
//     cleanup
//   };
// }
