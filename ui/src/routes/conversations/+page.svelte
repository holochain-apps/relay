<script lang="ts">
  import { getContext } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import ConversationSummary from '$lib/ConversationSummary.svelte';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  $: conversations = derived(relayStore.conversations, ($value) => {
    return $value.sort((a, b) => get(b.lastActivityAt) - get(a.lastActivityAt))
  })
</script>

<Header>
  <button on:click={() => goto('/account')}>
    <Avatar size={24} agentPubKey={relayStore.client.myPubKey} />
  </button>

  <button on:click={() => goto('/create')} class='absolute right-4'>
    <SvgIcon icon='plusCircle' size='24' />
  </button>
</Header>

<div class="container h-full mx-auto flex flex-col px-4">
  <ul class="flex-1 mt-10">
    {#each $conversations as conversation}
      <ConversationSummary store={conversation}></ConversationSummary>
    {/each}
  </ul>
</div>

<style>
</style>