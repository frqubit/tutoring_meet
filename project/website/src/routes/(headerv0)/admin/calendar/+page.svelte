<script lang="ts">
    import type { PageData } from "./$types";
    import CalendarTile from "$lib/components/CalendarTile.svelte";
    import { ClientPromise } from "$lib/utils/promise_utils";
    import {
        FetcherWithDefaultClientSettings,
        SessionFetcher,
    } from "$lib/fetchers";
    import { page } from "$app/state";
    import dayjs from "$lib/dayjs.js";

    let { data } = $props();

    const weeksDirection = +(page.url.searchParams.get("offset") ?? "0");
    const tz = dayjs.tz.guess();
    const now = dayjs().add(weeksDirection, "weeks");
    const in_tz = now.tz(tz);
    const start_of_week = in_tz
        .subtract(in_tz.get("day"), "days")
        .set("hour", 0)
        .set("minute", 0)
        .set("second", 0)
        .set("millisecond", 0);

    const end_of_week = start_of_week.add(7, "days");

    const sessionsPromise = new ClientPromise(async () => {
        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);

        const sessions = await fetcher.FindAllByFilter({
            body: {
                start: start_of_week.toDate(),
                end: end_of_week.toDate(),
                student_id: undefined,
                completed: undefined,
                client_id: undefined,
                max_count: undefined,
            },
        });

        return sessions;
    }).else([]);

    const MS_IN_MINUTE = 1000 * 60;
    const MS_IN_DAY = MS_IN_MINUTE * 60 * 24;

    const sessionsByDayPromise = new ClientPromise(async () => {
        const sessions = await sessionsPromise.resolver;

        const output: (typeof sessions)[] = [];

        for (let i = 0; i < 7; i++) {
            const date = start_of_week.add(i, "days");
            const dayStr = date.toDate().toDateString();
            const thisDay: typeof sessions = [];

            for (let i = 0; i < sessions.length; i++) {
                if (sessions[i].date.toDateString() == dayStr) {
                    thisDay.push(sessions[i]);
                }
            }

            output.push(thisDay);
        }

        return output;
    }).else([]);
</script>

<div class="flex flex-row justify-start self-stretch">
    <a
        data-sveltekit-reload
        href={`/admin/calendar?offset=${weeksDirection - 1}`}>Last week</a
    >
    <a
        class="ml-4"
        data-sveltekit-reload
        href={`/admin/calendar?offset=${weeksDirection + 1}`}>Next week</a
    >
    <a class="ml-auto" data-sveltekit-reload href="/calendar">Today</a>
</div>

<div class="flex flex-row h-full">
    {#each Array.from({ length: 7 }) as _, i}
        <div class="flex-1 border self-stretch flex flex-col items-center">
            <span class={`font-bold`}
                >{start_of_week.add(i, "days").toDate().toDateString()}</span
            >

            <hr class="w-full" />

            {#await sessionsByDayPromise.resolver then sessionsByDay}
                {#if sessionsByDay.length > i}
                    {#each sessionsByDay[i] as session}
                        <CalendarTile {session} />
                    {/each}
                {/if}
            {/await}
        </div>
    {/each}
</div>
