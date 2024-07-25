<script lang="ts">
	import { getContext } from 'svelte';
  import { derived } from "svelte/store";
  import { encodeHashToBase64 } from "@holochain/client";
  import { goto } from '$app/navigation';
	import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';
  import { type Contact } from '../../types';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

	const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let search = ''
  let currentContactLetter : string = ''

  $: contacts = derived(relayStore.contacts, ($contacts) => {
    const test = search.trim().toLowerCase()
    return $contacts.filter(c => c.data.firstName.toLowerCase().includes(test) || c.data.lastName.toLowerCase().includes(test) || (test.length > 2 && encodeHashToBase64(c.data.publicKey).toLowerCase().includes(test)))
      .sort((a, b) => a.data.firstName.localeCompare(b.data.firstName))
  })
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>

  <h1 class="flex-1 text-center">Create</h1>
</Header>

<div class="container mx-auto flex items-center flex-col flex-1 w-full p-4 text-secondary-500">
  <input type='text' class='w-full h-12 bg-surface-500 text-primary-700 text-md rounded-full px-4 my-5 border-0' placeholder='Search name or contact code' bind:value={search} />

  <div class='mb-5 flex justify-between w-full gap-4'>
    <button
      class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
      on:click={() => goto('/conversations/join')}
    >
      <SvgIcon icon='ticket' size='32' color='red' moreClasses='flex-grow' />
      <p class=''>Use Invite Code</p>
    </button>

    <button
      class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
      on:click={() => goto('/contacts/new')}
    >
      <SvgIcon icon='newPerson' size='32' color='red' moreClasses='flex-grow' />
      <p>New Contact</p>
    </button>

    <button
      class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
      on:click={() => goto('/conversations/new')}
    >
      <SvgIcon icon='people' size='32' color='red' moreClasses='flex-grow'/>
      <p>New Group</p>
    </button>
  </div>

  {#if $contacts.length === 0}
    <img src='/clear-skies.png' alt='No contacts' class='w-32 h-32 mb-4 mt-10' />
    <h2 class='text-lg text-primary-200'>You haven't added any contacts</h2>
    <p class='text-xs text-center'>There's nobody to chat with yet! Add your trusted friends and family by requesting their Relay contact code, found in their personal profile inside the Relay app.</p>
  {:else}
    <div class='w-full overflow-hidden font-light'>
      <div class='mb-4'>
        <p>Recent Contacts</p>
      </div>

      {#each $contacts as contact}
        {#if contact.firstName[0] !== currentContactLetter}
          <p class='my-3'>{currentContactLetter = contact.firstName[0]}</p>
        {/if}
        <div class='flex items-center justify-between w-full'>
          <div class='flex items-center'>
            <img src={contact.avatar} alt='Avatar' class='rounded-full w-8 h-8 object-cover mr-3' />
            <p class='text-primary-200 font-normal'>{contact.firstName} {contact.lastName}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>