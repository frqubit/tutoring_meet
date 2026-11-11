<script lang="ts">
    const { children } = $props();
</script>

<div class="w-full min-h-screen flex flex-col justify-start items-start">
    {@render children()}
</div>
