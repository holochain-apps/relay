<script lang="ts">
	import { isEmpty } from 'lodash-es';
  import { getContext } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { decodeHashFromBase64, type HoloHash } from "@holochain/client";
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import { t } from '$lib/translations';
  import { handleFileChange } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';

  // Silly thing to get around typescript issues with sveltekit-i18n
  const tAny = t as any

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  export let editContactId : string | null = null
  const contact = editContactId ? relayStore.getContact(editContactId) : null

  let firstName = contact?.data.firstName || ''
  let lastName = contact?.data.lastName || ''
  let publicKeyB64 = editContactId || ''
  let imageUrl = writable(contact?.data.avatar || '')

  let pendingSave = false
  let valid = false
  let error = writable('')
  let decodedPublicKey: HoloHash

  $: contacts = relayStore.contacts
  $: try {
    decodedPublicKey = decodeHashFromBase64(publicKeyB64)
    if (firstName.trim().length === 0 || publicKeyB64.trim().length === 0) {
      valid = false
      error.set('')
    } else if (decodedPublicKey.length !== 39) {
      valid = false
      error.set($t('contacts.invalid_contact_code'))
    } else if (!editContactId && $contacts.find(c => c.data.publicKeyB64 === publicKeyB64)) {
      valid = false
      error.set($t('contacts.contact_already_exist'))
    } else {
      valid = true
      error.set('')
    }
  } catch (e) {
    valid = false
    error.set($t('contacts.invalid_contact_code'))
  }

  async function saveContact(e: Event) {
    pendingSave = true
    e.preventDefault()
    try {
      const newContactData = { avatar: get(imageUrl), firstName, lastName, publicKeyB64 }
      const newContact = editContactId ? await relayStore.updateContact({...contact, ...newContactData }) : await relayStore.createContact(newContactData)
      if (newContact) {
        history.length > 0 ? history.back() : goto('/create')
      }
    } catch (e) {
      console.error(e)
      error.set($tAny('contacts.error_saving', { updating: !!editContactId }))
      pendingSave = false
    }
  }

</script>

<div class='flex justify-center items-center flex-col my-10'>
  <!-- Hidden file input -->
  <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" class='hidden' on:change={(event)=>handleFileChange(event, (imageData) => imageUrl.set(imageData))} />

  <!-- Label styled as a big clickable icon -->
  {#if $imageUrl}
    <div style="position:relative">
      <img src={$imageUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover' />
      <label for="avatarInput"
        class='rounded-full w-12 h-12 pl-1 bottom-0 right-0 bg-surface-500 absolute flex items-center justify-center cursor-pointer'
      >
        <img src='/image-placeholder.png' alt='Group Image Uploader' />
      </label>
    </div>
  {:else}
    <label for="avatarInput"
      class='rounded-full w-32 h-32 rounded-full bg-surface-400 flex items-center justify-center cursor-pointer'
    >
      <img src='/image-placeholder.png' alt='Contact Avatar Uploader' class='rounded-full w-16 h-16' />
    </label>
  {/if}
</div>

<div class='flex flex-col justify-start grow px-8 w-full'>
  <h3 class='h3'>{$t('common.first_name')} *</h3>
  <input
    autofocus
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder={$t('contacts.enter_first_name')}
    name='name'
    bind:value={firstName}
    minlength={1}
  />

  <h3 class='h3 mt-4'>{$t('common.last_name')}</h3>
  <input
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder={$t('contacts.enter_last_name')}
    name='name'
    bind:value={lastName}
  />

  <h3 class='h3 mt-4'>{$t('contacts.contact_code')} *</h3>
  <input
    class='bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder={$t('contacts.enter_contact_code')}
    name='publicKey'
    bind:value={publicKeyB64}
    minlength={1}
  />
  {#if !isEmpty($error)}
    <p class='text-xs text-error-500 mt-1 ml-1'>{$error}</p>
  {/if}
  {#if !editContactId}
    <p class='text-xs text-secondary-600 mt-4 mb-4'>{$t('contacts.request_contact_code')}</p>
  {/if}
</div>

<footer>
  <Button
    moreClasses='w-72 justify-center disabled:bg-surface-900 disabled:border disabled:border-surface-400 disabled:text-primary-100 disabled:opacity-100'
    onClick={(e) => { saveContact(e)}}
    disabled={!valid || pendingSave}
  >
    <strong class='ml-2'>{#if editContactId}{$t('common.save')}{:else}{$t('common.done')}{/if}</strong>
  </Button>
</footer>