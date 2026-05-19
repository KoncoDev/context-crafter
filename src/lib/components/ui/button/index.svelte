<script lang="ts">
	import { cn } from "$lib/utils";
    
    // In Svelte 5 with Shadcn you'd usually use bits-ui primitives
    // This is a simplified example as requested in "Shadcn components (Button, Input, etc)"
    // Typically these are installed via CLI
    let { class: className, children, ...rest } = $props();
</script>

<button class={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2", className)} {...rest}>
    {@render children?.()}
</button>
