<script lang="ts">
    import { C_MYSELF } from "$lib/backend/utils/constants";
    import {
        FetcherWithDefaultClientSettings,
        ClientFetcher,
    } from "$lib/fetchers";
    import { date_minutes_to_duration_string } from "$lib/utils/display_utils";
    import { ClientPromise } from "$lib/utils/promise_utils";
    import { localUserInfo } from "$lib/utils/user_utils.svelte";

    const userInfoPromise = localUserInfo();

    const nextSessionsPromise = new ClientPromise(async () => {
        const fetcher = FetcherWithDefaultClientSettings(ClientFetcher);
        const sessions = await fetcher.FindAllFutureSessionsOf({
            params: { id: C_MYSELF },
        });

        return sessions;
    }).else([]);
</script>

<h1 class="w-full text-center text-5xl font-bold mt-12 mb-20">
    Upcoming Sessions
</h1>

<div class="sm:mx-10 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
    {#await nextSessionsPromise.resolver then nextSessions}
        {#each nextSessions as session}
            <div
                class="relative flex flex-col justify-start items-start w-full px-6 py-4 pt-6 bg-gray-300 rounded-xl"
            >
                <span
                    class="
                        text-lg md:text-xl font-bold
                        absolute -top-4 -left-4
                        px-2 py-1
                        bg-background rounded-xl
                    "
                >
                    {session.date
                        .toDateString()
                        .split(" ")
                        .slice(1, 3)
                        .join(" ")}
                </span>
                <div class="flex flex-row justify-between items-start w-full">
                    <span
                        class="
                            text-2xl md:text-3xl
                        "
                    >
                        {date_minutes_to_duration_string(
                            session.date,
                            session.minutes,
                        )}
                    </span>
                </div>
                <span class="text-base md:text-xl">
                    {#await userInfoPromise}
                        ...
                    {:then userInfo}
                        {userInfo.find_student_of_mine(session.students)?.name}
                    {/await}
                </span>
            </div>
        {/each}
    {/await}
</div>
