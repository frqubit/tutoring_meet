<script lang="ts">
    import { C_MYSELF } from "$lib/backend/utils/constants";
    import RecentSessions from "$lib/components/client/RecentSessions.svelte";
    import {
        FetcherWithDefaultClientSettings,
        SessionFetcher,
    } from "$lib/fetchers";
    import { ClientPromise, NotOnClient } from "$lib/utils/promise_utils";

    import { localUserInfo } from "$lib/utils/user_utils.svelte";
    const userInfoPromise = localUserInfo();

    const nextSessionPromise = new ClientPromise(async () => {
        const fetcher = FetcherWithDefaultClientSettings(SessionFetcher);

        const session = await fetcher.FindNextOfClient({
            params: { id: C_MYSELF },
        });

        return session;
    });
</script>

<div class="flex flex-row justify-start items-start w-full">
    <div
        class="
            h-fit bg-gray-300 p-3 select-none ml-auto
            w-full lg:w-1/2
            grid grid-cols-2
        "
    >
        <!-- <div class="flex flex-row justify-start items-start w-full"> -->
        <span
            class="
                font-bold
                text-2xl sm:text-4xl
                self-center lg:self-start
            ">Next Session</span
        >
        <span
            class="
                font-light
                col-span-2 lg:col-span-1
                text-start lg:text-end
                text-2xl lg:text-4xl
                mt-2 lg:mt-0
            "
        >
            {#await nextSessionPromise.resolver}
                ...
            {:then nextSession}
                {#if nextSession instanceof NotOnClient}
                    ...
                {:else}
                    {nextSession?.date.toLocaleString()}
                {/if}
            {/await}
        </span>

        <div
            class="
                flex flex-col justify-start
                items-end
                col-start-2
                row-start-1 lg:row-start-2
                text-md lg:text-2xl
            "
        >
            <span class="font-light">
                {#await nextSessionPromise.resolver}
                    ...
                {:then nextSession}
                    {#if nextSession instanceof NotOnClient}
                        ...
                    {:else}
                        {nextSession?.minutes} minutes
                    {/if}
                {/await}
            </span>

            <span class="font-light">
                {#await nextSessionPromise.resolver}
                    ...
                {:then nextSession}
                    {#await userInfoPromise}
                        ...
                    {:then userInfo}
                        {#if nextSession instanceof NotOnClient}
                            ...
                        {:else}
                            {nextSession?.students.find(
                                (s) =>
                                    s.client.id == userInfo.value?.client?.id,
                            )?.name || "No Student Of Mine"}
                        {/if}
                    {/await}
                {/await}
            </span>
        </div>
        <!-- </div> -->

        {#await nextSessionPromise.resolver then nextSession}
            {#if nextSession != null && !(nextSession instanceof NotOnClient)}
                <a
                    href={`/session/${nextSession.id}`}
                    class="mt-auto font-bold text-xl text-blue-700"
                    >See Details</a
                >
            {/if}
        {/await}
    </div>
</div>

<div class="w-full flex flex-col justify-start items-start mt-8">
    <span class="font-bold text-3xl">Recent Sessions</span>
    <hr class="w-full border-2 md:hidden" />
    <div
        class="
            w-full mt-2 mb-2
            bg-white md:bg-gray-100
            p-0 md:p-4
        "
    >
        <RecentSessions {userInfoPromise} />
    </div>
</div>
