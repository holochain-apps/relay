<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';

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
    {#each $relayStore as $conversation ($conversation.data.id)}
      <li class='text-xl flex flex-row mb-5 items-start'>
        <a href="/conversations/{$conversation.data.id}" class='flex-1 flex flex-row items-center min-w-0 overflow-hidden'>
          {#if $conversation.data.config.image}
            <img src={$conversation.data.config.image} alt='Conversation' class='w-9 h-9 rounded-full mr-4 object-cover' />
          {:else}
            <span class='mr-4 w-9 h-9 flex items-center justify-center bg-surface-400 rounded-full'><SvgIcon icon='group' size='16' color='#ccc' /></span>
          {/if}
          <div class='flex flex-col flex-1 min-w-0 overflow-hidden'>
            <span class='text-base'>{@html $conversation.data.config.title}</span>
            <span class='text-nowrap overflow-hidden text-ellipsis text-xs min-w-0'>
              {@html Object.values($conversation.data.messages).at(-1)?.content || ''}
            </span>
          </div>
        </a>
        <span class='text-xs text-surface-200 flex flex-row items-center top-1 relative'>
          <SvgIcon icon='person' size='8' color='#ccc'/>
          <span class='ml-2'>{Object.values($conversation.data.agentProfiles).length}</span>
        </span>
      </li>
    {/each}
  </ul>
</div>
<style>
  .conversations-list {
    padding: 0 15px 0 15px;
  }
</style>