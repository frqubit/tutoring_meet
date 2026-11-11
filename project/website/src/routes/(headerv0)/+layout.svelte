<script lang="ts">
    import Header from "$lib/components/Header.svelte";

    let { children, data } = $props();
</script>

<div class="w-full min-h-screen p-6">
    <Header signed_in={data.signed_in} />
    {@render children()}
</div>
