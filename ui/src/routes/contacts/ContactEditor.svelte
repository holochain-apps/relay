<script lang="ts">
	import { isEmpty } from 'lodash-es';
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { decodeHashFromBase64, type HoloHash } from "@holochain/client";
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import SvgIcon from '$lib/SvgIcon.svelte';
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
    } else if (relayStore.client.myPubKeyB64 === publicKeyB64) {
      valid = false
      error.set($t('contacts.cant_add_yourself'))
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
    <div class='relative'>
      <img src={$imageUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover' />
      <label for="avatarInput"
        class='rounded-full w-12 h-12 pl-1 bottom-0 right-0 bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400 absolute flex items-center justify-center cursor-pointer'
      >
        <SvgIcon icon='image' color={$modeCurrent ? '%232e2e2e' : 'white'} />
      </label>
    </div>
  {:else}
    <label for="avatarInput"
      class='rounded-full w-32 h-32 rounded-full bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400 flex items-center justify-center cursor-pointer'
    >
      <SvgIcon icon='image' size='44' color={$modeCurrent ? '%232e2e2e' : 'white'} />
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
    <p class='text-xs text-secondary-600 dark:text-tertiary-700 mt-4 mb-4'>{$t('contacts.request_contact_code')}</p>
  {/if}
</div>

<footer>
  <Button
    moreClasses='w-72 justify-center variant-filled-tertiary disabled:border disabled:border-tertiary-700 disabled:bg-surface-500 disabled:text-tertiary-700 disabled:!opacity-100 dark:disabled:!bg-secondary-900 dark:disabled:!text-tertiary-700'
    onClick={(e) => { saveContact(e)}}
    disabled={!valid || pendingSave}
  >
    <strong class='ml-2'>{#if editContactId}{$t('common.save')}{:else}{$t('common.done')}{/if}</strong>
  </Button>
</footer>