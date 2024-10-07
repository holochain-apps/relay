<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte"
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import { RelayClient } from '$store/RelayClient';
  import { UserStore } from '$store/UserStore';
  import { handleFileChange, resizeAndExportAvatar } from '$lib/utils';

  const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

  let firstName = ''
  let lastName = ''
  $: avatarDataUrl = writable('')

  $: {
    // Subscribe to the store and update local state
    UserStore.subscribe($profile => {
      firstName = $profile.firstName;
      lastName = $profile.lastName;
      $avatarDataUrl = $profile.avatar;
    });
  }

  function createAccount() {
    relayClient.createProfile(firstName, lastName, $avatarDataUrl).then(() => {
      goto('/welcome');
    });
  }
</script>

<Header>
  <img src="/icon.png" alt="Logo" width='16' />
</Header>

<div class='flex justify-center items-center flex-col grow'>
  <h1 class='h1 mb-10'>{$t('common.select_an_avatar')}</h1>

  <!-- Hidden file input -->
  <input type="file" accept="image/*" id="avatarInput" class='hidden'
    on:change={(event) => handleFileChange(event,
      (imageData) => {
        UserStore.update(current => {
          return { firstName, lastName, avatar: imageData};
        })
      }
    )}
  />

  <!-- Label styled as a big clickable icon -->
  <label for="avatarInput" class="file-icon-label cursor-pointer bg-secondary-300 hover:bg-secondary-400 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden">
    {#if $avatarDataUrl}
      <img src={$avatarDataUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover' />
    {:else}
      <img src='/image-placeholder.png' alt='Avatar Uploader' class='rounded-full w-16 h-16' />
    {/if}
  </label>
</div>

<div class='items-right w-full flex justify-end pr-4'>
  <Button onClick={createAccount}>
    <SvgIcon icon='hand' size='20' color={$modeCurrent ? 'white' : '%23FD3524'} /> <strong class='ml-2'>{$t('common.jump_in')}</strong>
  </Button>
</div>