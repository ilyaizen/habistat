<script lang="ts">
// List of inspirational quotes
const quotes = [
  "Excellence is not a skill, it's an attitude.",
  "The future depends on what you do today.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Small steps daily lead to big changes yearly.",
  "Consistency is the mother of mastery.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The only way to do great work is to love what you do.",
  "Your habits shape your identity, and your identity shapes your habits.",
  "Progress, not perfection, is the goal."
];

// Get quote of the day (based on current date for consistency)
function getQuoteOfTheDay(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return quotes[dayOfYear % quotes.length];
}

const currentQuote = getQuoteOfTheDay();
</script>

<div class="w-full px-4 text-center">
  <p class="text-muted-foreground/50 text-shadow line-clamp-3 font-serif leading-relaxed italic">
    “{currentQuote}”
  </p>
</div>
