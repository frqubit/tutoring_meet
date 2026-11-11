<script lang="ts">
    import { send_cookie_fetch, toLocalISOString } from "$lib";
    import type { PageProps } from "./$types";
    import {
        FetcherWithDefaultClientSettings,
        SessionFetcher,
    } from "$lib/fetchers";
    import { goto } from "$app/navigation";
    import { SessionCompletion } from "$lib/backend/entities/Session.enum";
    import SessionNote from "$lib/components/SessionNote.svelte";
    import ListString from "$lib/components/input/ListString.svelte";

    let { data }: PageProps = $props();

    let variant: SessionCompletion = $state(SessionCompletion.NONE);

    async function get_session_note() {
        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);
        const studentId = data.session.students[0]?.id;

        if (!studentId) return null;

        const result = await fetcher.GetNoteForSession({
            params: {
                sessionId: +data.session.id,
                studentId,
            },
        });

        return result;
    }

    const DEFAULT_SESSION_NOTE = {
        subject: "",
        tutor_plan: [] as string[],
        event_summary: [] as string[],
        session_date: data.session.date || new Date(),
        session_id: data.session.id,
    };

    const sessionNotePromise = get_session_note();
    let sessionNoteState = $state(DEFAULT_SESSION_NOTE);

    async function submit_session() {
        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);

        const result = await fetcher.Submit({
            params: {
                id: data.id,
                variant,
            },
            body: sessionNoteState.event_summary,
        });

        goto("/admin/calendar", { replaceState: true });
    }
</script>

<div class="flex flex-col">
    <span class="font-bold ml-2"
        >{data.session.students[0].name}
        {data.session.students.length > 1
            ? `+ ${data.session.students.length - 1}`
            : ""}
    </span>
    <span class="font-bold ml-2">{data.session.date.toString()} </span>
    <span class="font-bold ml-2">{data.session.minutes} minutes</span>

    <div class="mt-2 w-full flex flex-row justify-start items-end gap-x-8">
        <span class="self-stretch text-2xl">Variant</span>

        <select class="self-stretch w-fit" bind:value={variant}>
            <option value={SessionCompletion.NONE}>Not Completed</option>
            <option value={SessionCompletion.COMPLETED}>Completed</option>
            <option value={SessionCompletion.NOSHOW}>No Show</option>
            <option value={SessionCompletion.LATECANCEL}>Cancelled Late</option>
        </select>
    </div>

    {#await sessionNotePromise then sessionNote}
        {(sessionNoteState =
            sessionNote != null ? sessionNote : DEFAULT_SESSION_NOTE) &&
            undefined}
        {#if sessionNoteState.tutor_plan.length == 0}
            <span>No tutor plan made</span>
        {:else}
            <span class="mt-4 text-xl underline">Tutor Plan</span>
            <ul class="ml-8">
                {#each sessionNoteState.tutor_plan as planitem}
                    <li class="list-disc">{planitem}</li>
                {/each}
            </ul>
        {/if}
        <div class="flex flex-row justify-start items-start mt-4">
            <span class="mr-8">Event Summary</span>
            <ListString bind:value={sessionNoteState.event_summary} />
        </div>
    {/await}

    <button
        onclick={submit_session}
        disabled={variant == SessionCompletion.NONE ||
            sessionNoteState.event_summary.length == 0 ||
            sessionNoteState.event_summary.findIndex((v) => v == "") != -1}
        class="bg-blue-700 text-white mt-4 disabled:bg-gray-500 hover:bg-blue-600 active:bg:blue-700"
    >
        Submit (summary saves for everyone)
    </button>
</div>
