<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { t } from '$lib/translations';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import ConversationSummary from '$lib/ConversationSummary.svelte';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  let search = ''

  $: conversations = derived(relayStore.conversations, ($value) => {
    return $value.filter(c => c.archived && c.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => get(b.lastActivityAt) - get(a.lastActivityAt))
  })
</script>

<Header>
  <button class='text-4xl pr-5 absolute z-10' on:click={() => goto('/conversations')}><SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' /></button>
  <h1 class="flex-1 text-center">{$t('conversations.archive')}</h1>
</Header>

<div class="container h-full mx-auto flex flex-col px-2">
  <div class='w-full relative my-5 my-2'>
    <input
      type='text'
      class='w-full h-12 !bg-tertiary-500 dark:!bg-secondary-500 dark:text-tertiary-500 text-md rounded-full pr-4 pl-10 border-0'
      placeholder={$t('conversations.search_placeholder')}
      bind:value={search}
    />
    <SvgIcon icon='search' size='24' color={$modeCurrent ? '%232e2e2e' : '%23ccc'} moreClasses='absolute top-3 left-3' />
  </div>
  <ul class="flex-1">
    {#each $conversations as conversation}
      <ConversationSummary store={conversation}></ConversationSummary>
    {/each}
  </ul>
</div>

<style>
</style>