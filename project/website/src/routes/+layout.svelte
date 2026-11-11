<script lang="ts">
    import favicon from "$lib/assets/favicon.svg";
    import { dev } from "$app/environment";
    import "./layout.css";

    const { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if dev}
    <div
        class="fixed top-0 left-0 z-10 w-full h-full flex items-center justify-center pointer-events-none"
    >
        <span
            class="
                text-9xl font-serif text-red-900 opacity-15
            "
        >
            DEV
        </span>
    </div>
{/if}

{@render children()}
