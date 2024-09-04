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
  import { copyToClipboard, handleFileChange } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';

  // Silly thing to get around typescript issues with sveltekit-i18n
  const tAny = t as any

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  export let editContactId : string | null = null
  let contact = editContactId ? relayStore.getContact(editContactId) : null

  let firstName = contact?.data.firstName || ''
  let lastName = contact?.data.lastName || ''
  let publicKeyB64 = editContactId || ''
  let imageUrl = writable(contact?.data.avatar || '')

  let editing = !editContactId
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
        if (!editContactId) {
          if (newContact.privateConversation) {
            return goto(`/conversations/${newContact.privateConversation?.id}`)
          } else {
            // XXX: this shouldn't happen, but is a backup if the private conversation doesn't get created for some reason
            goto(`/contacts/${newContact.publicKeyB64}`)
          }
        }
        editContactId = newContact.publicKeyB64
        contact = newContact
      }
      pendingSave = false
      editing = false
    } catch (e) {
      console.error(e)
      error.set($tAny('contacts.error_saving', { updating: !!editContactId }))
      pendingSave = false
    }
  }

  function cancel(e: Event) {
    e.preventDefault()
    if (!editContactId) {
      history.back()
    }
    editing = false
  }

</script>

<div class='flex flex-col flex-1 p-4 items-center'>
  <div class='flex justify-center items-center flex-col mt-6 mb-5'>
    <!-- Hidden file input -->
    <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" class='hidden' on:change={(event) => { editing = true; handleFileChange(event, (imageData) => imageUrl.set(imageData))}} />

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

  {#if editing}
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

    <footer class='flex justify-center'>
      <Button
        moreClasses='w-36 justify-center !variant-filled-tertiary dark:!variant-filled-secondary'
        onClick={(e) => { cancel(e)}}
      >
        <strong class=''>{$t('common.cancel')}</strong>
      </Button>
      <Button
        moreClasses='w-48 ml-4 justify-center !variant-filled-secondary dark:!variant-filled-tertiary disabled:border disabled:!border-tertiary-700 disabled:!bg-surface-500 disabled:!text-tertiary-700 disabled:!opacity-100 dark:disabled:!bg-secondary-900 dark:disabled:!text-tertiary-700'
        onClick={(e) => { saveContact(e)}}
        disabled={!valid || pendingSave}
      >
        <strong class=''>{#if editContactId}{$t('common.save')}{:else}{$t('common.done')}{/if}</strong>
      </Button>
    </footer>
  {:else}
    <div class="flex flex-col flex-1 items-center">
      <div class="flex flex-row justify-center">
        <h1 class='text-3xl flex-shrink-0 mr-2'>{contact?.name}</h1>

        <button on:click={() => editing = true}>
          <SvgIcon icon='write' size='24' color='gray' moreClasses='cursor-pointer' />
        </button>
      </div>
      <div class='flex items-center justify-center mt-2'>
        <span class='w-64 text-nowrap overflow-hidden text-ellipsis text-secondary-400 dark:text-tertiary-700 mr-1'>
          {contact?.publicKeyB64}
        </span>
        <button on:click={() => contact?.publicKeyB64 && copyToClipboard(contact.publicKeyB64)}>
          <SvgIcon icon='copy' size='20' color='%23999' />
        </button>
      </div>
    </div>

    {#if contact?.pendingConnection}
      <div class='flex flex-col items-center bg-tertiary-500 dark:bg-secondary-500 rounded-xl p-4 mx-8'>
        <SvgIcon icon='handshake' size='36' color={$modeCurrent ? '%23232323' : 'white'} />
        <h1 class='text-secondary-500 dark:text-tertiary-100 text-xl font-bold mt-2'>{$t('contacts.pending_connection_header')}</h1>
        <p class='text-sm text-center text-secondary-400 dark:text-tertiary-700 mt-4 mb-6'>{$tAny('contacts.pending_connection_description', { name: contact?.firstName })}</p>
        <div class='flex justify-center'>
          <Button moreClasses='bg-surface-100 text-sm text-secondary-500 dark:text-tertiary-100 font-bold dark:bg-secondary-900' onClick={() => contact?.privateConversation?.copyInviteCodeForAgent(contact?.publicKeyB64) }>
            <SvgIcon icon='copy' size='20' color='%23FD3524' moreClasses='mr-2' />
            {$t('contacts.copy_invite_code')}
          </Button>
        </div>
      </div>
    {:else}
      <Button moreClasses='variant-filled-tertiary text-sm font-bold w-auto' onClick={() => goto(`/conversations/${contact?.privateConversation?.id}`)}>
        <SvgIcon icon='speechBubble' size='20' color='%23FD3524' moreClasses='mr-2' />
        {$t('contacts.send_message')}
      </Button>
    {/if}

  {/if}
</div>