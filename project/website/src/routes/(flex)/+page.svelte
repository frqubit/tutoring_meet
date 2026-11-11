<script>
    import { SIGNIN_URL } from "$lib";
</script>

<div class="flex flex-row justify-start items-start flex-1 self-stretch">
    <div class="flex-1 self-stretch bg-gray-500"></div>
    <div class="flex flex-col justify-center items-center flex-1 self-stretch">
        <h1 class="text-5xl text-center">
            Check your child's<br />tutoring progress here
        </h1>

        <div class="flex flex-col justify-center items-center mt-28 gap-y-6">
            <a class="text-3xl" href={SIGNIN_URL}>Sign in</a>
            <span class="text-gray-500"> -or- </span>
            <span class="text-3xl">Register</span>
        </div>
    </div>
</div>
