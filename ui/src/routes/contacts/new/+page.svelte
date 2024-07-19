<script lang="ts">
	import { getContext } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { resizeAndExportAvatar } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';
  import { Privacy } from '../../../types';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let name = ''
  let publicKey = ''
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
          const imageData = resizeAndExportAvatar(img)
          imageUrl.set(imageData);
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

  async function createContact(e: Event) {
    pendingCreate = true;
    e.preventDefault();
    const contact = await relayStore.createContact(publicKey, name, get(imageUrl));
    if (contact) {
      goto(`/contacts/${contact.data.id}`)
    }
  }

  $: valid = name.trim().length >= 0
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">Create New Contact</h1>
</Header>

<div class='flex justify-center items-center flex-col my-10'>
  <!-- Hidden file input -->
  <input type="file" accept="image/jpeg, image/png, image/gif" capture id="avatarInput" class='hidden' on:change={handleFileChange} />

  <!-- Label styled as a big clickable icon -->
  <label for="avatarInput" class="file-icon-label cursor-pointer bg-surface-400 hover:bg-surface-300 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden">
    {#if $imageUrl}
      <img src={$imageUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover' />
    {:else}
      <img src='/image-placeholder.png' alt='Contact Avatar Uploader' class='rounded-full w-16 h-16' />
    {/if}
  </label>
</div>

<div class='flex flex-col justify-start grow'>
  <h1 class='h1'>Name</h1>
  <input
    autofocus
    class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Enter name here'
    name='name'
    bind:value={name}
    minlength={1}
  />

  <h1 class='h1'>Contact code</h1>
  <input
    class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Enter contact code'
    name='publicKey'
    bind:value={publicKey}
    minlength={1}
  />
</div>

<footer>
  <Button moreClasses='w-72 justify-center' onClick={(e) => { createContact(e)}} disabled={!valid || pendingCreate}>
    <strong class='ml-2'>Done</strong>
  </Button>
</footer>