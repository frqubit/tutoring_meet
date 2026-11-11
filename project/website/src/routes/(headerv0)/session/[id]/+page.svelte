<script lang="ts">
    import {
        FetcherWithDefaultClientSettings,
        SessionFetcher,
    } from "$lib/fetchers";
    import { ClientPromise, NotOnClient } from "$lib/utils/promise_utils.js";
    import { localUserInfo } from "$lib/utils/user_utils.svelte.js";

    const { params } = $props();

    const userInfoPromise = localUserInfo();

    const sessionPromise = new ClientPromise(async () => {
        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);

        const response = await fetcher.FindOne({ params: { id: +params.id } });

        return response;
    });

    const myStudentsPromise = new ClientPromise(async () => {
        const session = await sessionPromise.resolver;

        if (session instanceof NotOnClient || session == null) return [];

        const userInfo = await userInfoPromise;
        const clientId = userInfo.value?.client?.id;
        if (clientId == undefined) return [];

        return session.students.filter((s) => s.client.id == clientId);
    });

    const mySessionNotePromise = new ClientPromise(async () => {
        const session = await sessionPromise.resolver;
        if (session instanceof NotOnClient || session == null) return null;

        const myStudents = await myStudentsPromise.resolver;
        if (myStudents instanceof NotOnClient) return null;

        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);
        const response = await fetcher.GetNoteForSession({
            params: {
                sessionId: session.id,
                studentId: myStudents[0].id,
            },
        });

        return response;
    });
</script>

{#await sessionPromise.resolver then session}
    {#if !(session instanceof NotOnClient) && session != null}
        <span class="text-4xl font-bold mt-10 block">
            Session on {session.date.toLocaleDateString()} ({session.minutes} minutes)
        </span>

        <div
            class="grid grid-cols-2 justify-start items-start w-full mt-8 gap-x-16"
        >
            <div
                class="
                    grid grid-cols-2 justify-start items-start w-full
                    bg-gray-200 p-4 px-8 rounded-2xl
                    text-2xl
                    gap-y-2
                "
            >
                <span>
                    {#await myStudentsPromise.resolver}
                        Student
                    {:then myStudents}
                        {!(myStudents instanceof NotOnClient) &&
                        myStudents.length > 1
                            ? "Students"
                            : "Student"}
                    {/await}
                </span>
                <div class="flex flex-col justify-start items-start">
                    {#await myStudentsPromise.resolver then myStudents}
                        {#if !(myStudents instanceof NotOnClient)}
                            {#each myStudents as student}
                                <span class="font-light">
                                    {student.name}
                                </span>
                            {/each}
                        {/if}
                    {/await}
                </div>
                <span>Subjects</span>
                <span class="font-light">
                    {#await mySessionNotePromise.resolver}
                        ...
                    {:then mySessionNote}
                        {#if !(mySessionNote instanceof NotOnClient)}
                            {mySessionNote?.subject || "No Subject Set"}
                        {:else}
                            No subject set
                        {/if}
                    {/await}
                </span>
            </div>

            <div>
                <span class="font-bold text-3xl">Summary</span>
                <ul class="list-disc ml-8 mt-1">
                    {#await mySessionNotePromise.resolver}
                        ...
                    {:then mySessionNote}
                        {#if !(mySessionNote instanceof NotOnClient)}
                            {#each mySessionNote?.event_summary as event}
                                <li>{event}</li>
                            {/each}
                        {/if}
                    {/await}
                </ul>
            </div>
        </div>
    {/if}
{/await}
