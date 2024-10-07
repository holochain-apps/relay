<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { t } from '$lib/translations';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import ConversationSummary from '$lib/ConversationSummary.svelte';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  let search = ''
  $: hasArchive = false

  $: conversations = derived(relayStore.conversations, ($value) => {
    return $value.filter(c => {
      if (c.archived) {
        hasArchive = true;
      }
      return !c.archived && c.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    }).sort((a, b) => get(b.lastActivityAt) - get(a.lastActivityAt))
  })
</script>

<Header>
  <button on:click={() => goto('/account')} class='flex-1 flex items-start'>
    <Avatar size={24} agentPubKey={relayStore.client.myPubKey} />
  </button>

  <button on:click={() => goto('/create')} class=''>
    <SvgIcon icon='plusCircle' size='24' />
  </button>
</Header>

<div class="container h-full mx-auto flex flex-col px-2">
  <div class='w-full relative mt-5 mb-3 flex'>
    <input
      type='text'
      class='w-full h-12 !bg-tertiary-500 dark:!bg-secondary-500 dark:text-tertiary-500 text-md rounded-full pr-4 pl-10 border-0'
      placeholder={$t('conversations.search_placeholder')}
      bind:value={search}
    />
    <SvgIcon icon='search' size='24' color={$modeCurrent ? '%232e2e2e' : '%23ccc'} moreClasses='absolute top-3 left-3' />
  </div>
  <ul class="flex-1">
    {#if hasArchive}
      <li class='flex items-center hover:bg-tertiary-500 dark:hover:bg-secondary-500 py-2 rounded-lg'>
        <button on:click={() => goto('/conversations/archive')} class='flex items-center w-full'>
          <SvgIcon icon='archive' size='24' color={$modeCurrent ? '%232e2e2e' : '%23ccc'} moreClasses='ml-4 mr-6' />
          Archived
        </button>
      </li>
    {/if}
    {#each $conversations as conversation}
      <ConversationSummary store={conversation}></ConversationSummary>
    {/each}
  </ul>
</div>

<style>
</style>