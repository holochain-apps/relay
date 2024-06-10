<script lang="ts">
	import { getContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { resizeAndExportAvatar } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';
  import { Privacy } from '../../../types';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  const MIN_TITLE_LENGTH = 3;
  let title = ''
  let imageUrl = writable('')
  let pendingCreate = false

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>): void => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageUrl.set(resizeAndExportAvatar(img));
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

  async function createConversation(e: Event, privacy: Privacy) {
    pendingCreate = true;
    e.preventDefault();
    const conversation = await relayStore.createConversation(title, privacy);
    if (conversation) {
      goto(`/conversations/${conversation.data.id}`)
    }
  }

  $: valid = title.trim().length >= MIN_TITLE_LENGTH
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='back' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">New Conversation</h1>
</Header>

<div class='flex justify-center items-center flex-col my-10'>
  <!-- Hidden file input -->
  <input type="file" id="avatarInput" class='hidden' on:change={handleFileChange}>

  <!-- Label styled as a big clickable icon -->
  <label for="avatarInput" class="file-icon-label cursor-pointer bg-surface-400 hover:bg-surface-300 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden">
    {#if $imageUrl}
      <img src={$imageUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover'>
    {:else}
      <img src='/image-placeholder.png' alt='Conversation Uploader' class='rounded-full w-16 h-16'>
    {/if}
  </label>
</div>

<div class='flex flex-col justify-start grow'>
  <h1 class='h1'>Title</h1>
  <input
    class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Name this conversation'
    name='title'
    bind:value={title}
    minlength={MIN_TITLE_LENGTH}
  />
</div>

<!-- <div class='items-right w-full flex justify-end'> -->
<footer>
  <Button moreClasses='w-72 justify-center' onClick={(e) => { createConversation(e, Privacy.Private)}} disabled={!valid || pendingCreate}>
    <SvgIcon icon='person' size='16' /> <strong class='ml-2'>Create private conversation</strong>
  </Button>

  <Button moreClasses='w-72 justify-center' onClick={(e) => { createConversation(e, Privacy.Public)}} disabled={!valid || pendingCreate}>
    <SvgIcon icon='people' size='24' /> <strong class='ml-2'>Create open conversation</strong>
  </Button>
</footer>