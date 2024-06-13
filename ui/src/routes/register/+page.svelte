<script lang="ts">
	import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { UserStore } from '$store/UserStore';

  const MIN_NAME_LENGTH = 3;
  let nickname = ''

  $: {
    // Subscribe to the store and update local state
    UserStore.subscribe($profile => {
      nickname = $profile.nickname;
    });
  }

  function saveName() {
    nickname = nickname.trim();
    UserStore.update(current => {
        return { ...current, nickname };
    });
    if (nickname.length > MIN_NAME_LENGTH) {
      goto('/register/avatar');
    }
  }
</script>

<Header>
  <img src="/logo.png" alt="Logo" width='16' />
</Header>

<form on:submit|preventDefault={saveName} class='contents'>
  <div class='flex flex-col justify-center grow'>
    <h1 class='h1'>What is your name?</h1>
    <input
      autofocus
      class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
      type='text'
      placeholder='Enter your display name'
      name='nickname'
      bind:value={nickname}
      minlength={MIN_NAME_LENGTH}
    />
  </div>

  <div class='items-right w-full flex justify-end right-pad'>
    <Button on:click={saveName} disabled={nickname.trim().length < MIN_NAME_LENGTH}>
      Next:&nbsp;<strong>Avatar</strong> <SvgIcon icon='arrowRight' size='42' />
    </Button>
  </div>
</form>