<script lang="ts">
	import { isEmpty } from 'lodash-es';
  import { getContext } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { decodeHashFromBase64, encodeHashToBase64, type HoloHash } from "@holochain/client";
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { resizeAndExportAvatar } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let firstName = ''
  let lastName = ''
  let publicKey = ''
  let imageUrl = writable('')
  let pendingCreate = false
  let valid = false
  let error = writable('')
  let decodedPublicKey: HoloHash

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
    pendingCreate = true
    e.preventDefault()
    const contact = await relayStore.createContact({ publicKey: decodedPublicKey, firstName, lastName, avatar: get(imageUrl) })
    if (contact) {
      goto(`/create`)
    }
  }

  $: contacts = relayStore.contacts
  $: try {
    decodedPublicKey = decodeHashFromBase64(publicKey)
    if (firstName.trim().length === 0 || publicKey.trim().length === 0) {
      valid = false
      error.set('')
    } else if (decodedPublicKey.length !== 39) {
      valid = false
      error.set('Invalid contact code')
    } else if ($contacts.find(c => encodeHashToBase64(c.data.publicKey) === publicKey)) {
      valid = false
      error.set('Contact already exists')
    } else {
      valid = true
      error.set('')
    }
  } catch (e) {
    valid = false
    error.set('Invalid contact code')
  }
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

<div class='flex flex-col justify-start grow px-8'>
  <h3 class='h3'>First Name *</h3>
  <input
    autofocus
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Enter first name'
    name='name'
    bind:value={firstName}
    minlength={1}
  />

  <h3 class='h3 mt-4'>Last Name</h3>
  <input
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Enter last name'
    name='name'
    bind:value={lastName}
  />

  <h3 class='h3 mt-4'>Contact code *</h3>
  <input
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder='Enter contact code'
    name='publicKey'
    bind:value={publicKey}
    minlength={1}
  />
  {#if !isEmpty($error)}
    <p class='text-xs text-error-500 mt-1 ml-1'>{$error}</p>
  {/if}
  <p class='text-xs text-secondary-600 mt-4'>Request your contact's unique Relay contact code , which is found by visiting their personal profile in the Relay App.</p>
</div>

<footer>
  <Button
    moreClasses='w-72 justify-center disabled:bg-surface-900 disabled:border disabled:border-surface-400 disabled:text-primary-100 disabled:opacity-100'
    onClick={(e) => { createContact(e)}}
    disabled={!valid || pendingCreate}
  >
    <strong class='ml-2'>Done</strong>
  </Button>
</footer>