<script lang="ts">
    import { type LatestFormat as SessionNoteFormat } from "$lib/backend/webdata/session_note";
    import ListString from "./input/ListString.svelte";

    interface SessionNoteProps {
        session_note: SessionNoteFormat["sessions"][number];
    }

    const { session_note = $bindable() }: SessionNoteProps = $props();
</script>

<div class="grid grid-cols-[auto_1fr] gap-y-3">
    <span class="mr-8">Subject</span>
    <input class="border-b" type="text" bind:value={session_note.subject} />

    <span class="mr-8">Tutor Plan</span>
    <ListString bind:value={session_note.tutor_plan} />

    <span class="mr-8">Event Summary</span>
    <ListString bind:value={session_note.event_summary} />
</div>
