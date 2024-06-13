<script lang="ts">
  import { getContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte"
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { RelayClient } from '$store/RelayClient';
  import { UserStore } from '$store/UserStore';
  import { resizeAndExportAvatar } from '$lib/utils';

  const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

  let nickname = ''
  $: avatarDataUrl = writable('')

  $: {
    // Subscribe to the store and update local state
    UserStore.subscribe($profile => {
      nickname = $profile.nickname;
      $avatarDataUrl = $profile.avatar;
    });
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>): void => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          UserStore.update(current => {
            return { ...current, avatar: resizeAndExportAvatar(img)};
          });
        };
        img.src = e.target?.result as string;
      };

      reader.onerror = (e): void => {
        console.error('Error reading file:', e);
        reader.abort();
      };

      reader.readAsDataURL(file);
    }
  }

  function createAccount() {
    relayClient.createProfile(nickname, $avatarDataUrl).then(() => {
      goto('/welcome');
    });
  }
</script>

<Header>
  <img src="/logo.png" alt="Logo" width='16' />
</Header>

<div class='flex justify-center items-center flex-col grow'>
  <h1 class='h1 mb-10'>Select an avatar</h1>

  <!-- Hidden file input -->
  <input type="file" id="avatarInput" class='hidden' on:change={handleFileChange}>

  <!-- Label styled as a big clickable icon -->
  <label for="avatarInput" class="file-icon-label cursor-pointer bg-surface-400 hover:bg-surface-300 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden">
    {#if $avatarDataUrl}
      <img src={$avatarDataUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover'>
    {:else}
      <img src='/image-placeholder.png' alt='Avatar Uploader' class='rounded-full w-16 h-16'>
    {/if}
  </label>
</div>

<div class='items-right w-full flex justify-end pr-4'>
  <Button onClick={createAccount}>
    <SvgIcon icon='hand' size='20' /> <strong class='ml-2'>Jump in</strong>
  </Button>
</div>