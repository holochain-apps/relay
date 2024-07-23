<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import ConversationSummary from '$lib/ConversationSummary.svelte';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
</script>

<Header>
  <button on:click={() => goto('/account')}>
    <Avatar size={24} agentPubKey={relayStore.client.myPubKey} showNickname={false} />
  </button>

  <button on:click={() => goto('/create')} class='absolute right-4'>
    <SvgIcon icon='plusCircle' size='24' />
  </button>
</Header>

<div class="container h-full mx-auto flex flex-col conversations-list">
  <ul class="flex-1 mt-10">
    {#each $relayStore as conversation}
      <ConversationSummary store={conversation}></ConversationSummary>
    {/each}
  </ul>
</div>
<style>
  .conversations-list {
    padding: 0 15px 0 15px;
  }
</style>