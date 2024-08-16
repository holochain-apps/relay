<script lang="ts">
	import { getContext } from 'svelte';
  import { derived, get, writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { t } from '$lib/translations';
  import LocalStorageStore from '$store/LocalStorageStore';
  import { RelayStore } from '$store/RelayStore';
  import { copyToClipboard } from '$lib/utils';
  import { type Contact, Privacy } from '../../../../types'

  const tAny = t as any

	$: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  $: conversation = relayStore.getConversation(conversationId);

  let selectedContacts = writable<Contact[]>([])
  let search = ''

  $: contacts = derived(relayStore.contacts, ($contacts) => {
    const test = search.trim().toLowerCase()
    return $contacts.filter(c => c.data.firstName.toLowerCase().includes(test) || c.data.lastName.toLowerCase().includes(test) || (test.length > 2 && c.data.publicKeyB64.toLowerCase().includes(test)))
      .sort((a, b) => a.data.firstName.localeCompare(b.data.firstName))
  })

  function selectContact(publicKeyB64: string) {
    const contact = $contacts.find(c => c.data.publicKeyB64 === publicKeyB64)
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

  async function addContactsToConversation() {
    // TODO: update config.title?

    if (conversation) {
      const localStore = LocalStorageStore(`conversation_${conversation.id}`, '')
      localStore.set(get(localStore).split(',').concat($selectedContacts.map(c => c.publicKeyB64)).join(','))
      goto(`/conversations/${conversation.id}/details`)
    }
  }
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}>
    <SvgIcon icon='caretLeft' color='white' size='10' />
  </button>
  <h1 class="flex-1 text-center">{$tAny('conversations.add_people', { public: conversation && conversation.data.privacy === Privacy.Public })}</h1>
</Header>

{#if conversation}
  {#if conversation.data.privacy === Privacy.Public}
    <div class="container mx-auto flex flex-col justify-center items-center grow px-10">
      <img src='/share-public-invite.png' alt="Share Key" class='mb-4'/>
      <h1 class='h1 mb-2'>{$t('conversations.open_invite_code')}</h1>
      <p class='mb-5'>{$t('conversations.share_with_people')}</p>
    </div>

    <footer>
      <Button onClick={() => copyToClipboard(conversation.publicInviteCode)} moreClasses='w-64'>
        <p class='w-64 text-nowrap overflow-hidden text-ellipsis'>{conversation.publicInviteCode}</p>
        <img src="/copy.svg" alt="Copy Icon" width='16' />&nbsp;<span class='text-xs text-tertiary-500'>{$t('common.copy')}</span>
      </Button>
      <Button moreClasses='bg-surface-400 text-secondary-50 w-64 justify-center' onClick={() => goto(`/conversations/${conversationId}`)}>{$t('common.done')}</Button>
    </footer>
  {:else}
    <div class="container mx-auto flex items-center flex-col flex-1 w-full p-5 text-secondary-500 relative">
      <input
        type='text'
        class='w-full h-12 bg-surface-500 text-primary-700 text-md rounded-full px-4 my-5 border-0'
        placeholder={$t('conversations.search_placeholder')}
        bind:value={search}
      />

      {#if $contacts.length === 0}
        <img src='/clear-skies.png' alt='No contacts' class='w-32 h-32 mb-4 mt-10' />
        <h2 class='text-lg text-primary-200'>{$t('create.no_contacts_header')}</h2>
        <p class='text-xs text-center'>{$t('create.no_contacts_text')}</p>
      {:else}
        <div class='w-full font-light'>
          {#each $contacts as contact, i}
            {#if i === 0 || contact.firstName.charAt(0).toUpperCase() !== $contacts[i - 1].firstName.charAt(0).toUpperCase()}
              <p class='mt-2 mb-1 pl-0'>{contact.firstName[0].toUpperCase()}</p>
            {/if}
            {@const selected = $selectedContacts.find(c => c.publicKeyB64 === contact.data.publicKeyB64)}
            {@const alreadyInvited = !!conversation.invitedContactKeys.find(k => k === contact.data.publicKeyB64)}
            {@const alreadyInConversation = !!conversation.memberList().find(m => m?.publicKeyB64 === contact.data.publicKeyB64)}
            <button
              class='flex items-center justify-between w-full rounded-2xl p-2 -ml-2 mb-2 {selected && 'bg-surface-400'} text-primary-200 font-normal disabled:text-primary-700 disabled:font-light'
              on:click={() => selectContact(contact.data.publicKeyB64)}
              disabled={alreadyInConversation || alreadyInvited}
            >
              <div class='rounded-full w-8 h-8 mr-3'>
                <Avatar size={38} image={contact.avatar} agentPubKey={contact.publicKeyB64} />
              </div>
              <p class='flex-1 text-start'>{contact.firstName} {contact.lastName}</p>
              {#if alreadyInConversation}
                <span class='text-xs text-primary-700 font-extralight'>{$t('conversations.already_member')}</span>
              {:else if alreadyInvited}
                <span class='text-xs text-primary-700 font-extralight'>{$t('conversations.already_invited')}</span>
              {:else}
                <span class='text-lg text-tertiary-600 font-extrabold'>+</span>
              {/if}
            </button>
          {/each}
        </div>

        {#if $selectedContacts.length > 0}
          <button
            class='fixed right-5 bottom-5 bg-tertiary-500 text-white rounded-full py-1 pl-2 pr-4 border-0 flex items-center justify-center max-w-1/2'
            on:click={() => addContactsToConversation()}
          >
            <span class='rounded-full w-9 h-9 bg-primary-100 text-tertiary-500 text-sm flex items-center justify-center mr-2 font-extrabold'>
              <SvgIcon icon='person' size='12' color='red' moreClasses='mr-1' />
              {$selectedContacts.length}
            </span>
            <div class='overflow-hidden text-ellipsis nowrap'>
              <div class='text-md text-start'>{$t('conversations.add_to_conversation')}}</div>
              <div class='text-xs font-light text-start pb-1'>with {$selectedContacts.map(c => c.firstName).join(', ')}</div>
            </div>
          </button>
        {/if}
      {/if}
    </div>
  {/if}
{/if}