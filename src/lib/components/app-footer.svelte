<script lang="ts">
  import { Github } from "lucide-svelte";

  const currentYear = new Date().getFullYear();
</script>

<footer class="border-border/40 border-t">
  <div class="container mx-auto flex h-10 items-center justify-between px-4">
    <!-- Copyright -->
    <div class="text-muted-foreground text-sm">
      {currentYear} &copy; Habistat
    </div>

    <!-- Social links -->
    <div class="flex items-center space-x-2">
      <a href="https://github.com/ilyaizen/habistat" target="_blank" rel="noopener noreferrer">
        <Github class="h-4 w-4" />
      </a>
    </div>
  </div>
</footer>
