<script lang="ts">
	import { getContext } from 'svelte';
  import { derived, get, writable } from "svelte/store";
  import { decodeHashFromBase64 } from "@holochain/client";
  import "@holochain-open-dev/elements/dist/elements/holo-identicon.js";
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { ConversationStore } from '$store/ConversationStore';
  import { RelayStore } from '$store/RelayStore';
  import { type Contact, Privacy } from '../../types';

	const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let selectedContacts = writable<Contact[]>([])
  let search = ''
  let existingConvesation : ConversationStore | undefined = undefined

  selectedContacts.subscribe(value => {
    if (value.length > 0) {
      existingConvesation = get(relayStore.conversations).find(c => c.invitedContactKeys.length === value.length && c.invitedContactKeys.every(k => value.find(c => c.publicKeyB64 === k)))
    } else {
      existingConvesation = undefined
    }
  })

  $: contacts = derived(relayStore.contacts, ($contacts) => {
    const test = search.trim().toLowerCase()
    return $contacts.filter(c => c.data.firstName.toLowerCase().includes(test) || c.data.lastName.toLowerCase().includes(test) || (test.length > 2 && c.data.publicKeyB64.toLowerCase().includes(test)))
      .sort((a, b) => a.data.firstName.localeCompare(b.data.firstName))
  })

  function selectContact(publicKey: string) {
    const contact = $contacts.find(c => c.data.publicKeyB64 === publicKey)
    if (contact) {
      selectedContacts.update(currentContacts => {
        if (currentContacts.find(c => c.publicKeyB64 === contact.data.publicKeyB64)) {
          // If already selected then unselect
          return currentContacts.filter(c => c.publicKeyB64 !== contact.data.publicKeyB64)
        } else {
          // otherwise select the contact
          return [...currentContacts, contact]
        }
      })
    }
  }

  async function createConversation() {
    if (existingConvesation) {
      goto(`/conversations/${existingConvesation.id}`)
      return
    }

    const title = $selectedContacts.length == 1 ? $selectedContacts[0].firstName + ' ' + $selectedContacts[0].lastName
      : $selectedContacts.length == 2 ? $selectedContacts.map(c => c.firstName).join(' & ')
      : $selectedContacts.map(c => c.firstName).join(', ')

    const conversation = await relayStore.createConversation(title, '', Privacy.Private)
    if (conversation) {
      localStorage.setItem(`conversation_${conversation.id}`, JSON.stringify($selectedContacts.map(c => c.publicKeyB64).join(',')))
      goto(`/conversations/${conversation.id}/details`)
    }
  }
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>

  <h1 class="flex-1 text-center">Create</h1>
</Header>

<div class="container mx-auto flex items-center flex-col flex-1 w-full p-5 text-secondary-500 relative">
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
    <div class='w-full font-light'>
      {#each $contacts as contact, i}
        {#if i === 0 || contact.firstName.charAt(0).toUpperCase() !== $contacts[i - 1].firstName.charAt(0).toUpperCase()}
          <p class='mt-2 mb-1 pl-0'>{contact.firstName[0].toUpperCase()}</p>
        {/if}
        {@const selected = $selectedContacts.find(c => c.publicKeyB64 === contact.data.publicKeyB64)}
        <button class='flex items-center justify-between w-full rounded-2xl p-2 -ml-2 mb-2 {selected && 'bg-surface-400'}' on:click={() => selectContact(contact.data.publicKeyB64)}>
            <Avatar size={38} image={contact.avatar} agentPubKey={contact.publicKeyB64} moreClasses='mr-3' />
          <p class='text-primary-200 font-normal flex-1 text-start'>{contact.firstName} {contact.lastName}</p>
          {#if selected}
            <button
              class='h-8 pl-4 pr-2 bg-white text-secondary-700 rounded-full flex items-center justify-center'
              on:click={() => goto('/contacts/' + contact.publicKeyB64)}
            >
              <SvgIcon icon='person' size='12' color='#999' moreClasses='mb-0.5' />
              <span class='ml-1 mr-2 text-xs'>View</span>
              <span class='w-5 h-5 rounded-full bg-tertiary-400'><span>
            </button>
          {:else}
            <span class='text-lg text-tertiary-600 font-extrabold'>+</span>
          {/if}
        </button>
      {/each}
    </div>

    {#if $selectedContacts.length > 0}
      <button
        class='fixed right-5 bottom-5 bg-tertiary-500 text-white rounded-full py-1 pl-2 pr-4 border-0 flex items-center justify-center max-w-1/2'
        on:click={() => createConversation()}
      >
        <span class='rounded-full w-9 h-9 bg-primary-100 text-tertiary-500 text-sm flex items-center justify-center mr-2 font-extrabold'>
          <SvgIcon icon='person' size='12' color='red' moreClasses='mr-1' />
          {$selectedContacts.length}
        </span>
        <div class='overflow-hidden text-ellipsis nowrap'>
          <div class='text-md text-start'>{#if existingConvesation}Open{:else}Create{/if} conversation</div>
          <div class='text-xs font-light text-start pb-1'>with {$selectedContacts.map(c => c.firstName).join(', ')}</div>
        </div>
      </button>
    {/if}
  {/if}
</div>