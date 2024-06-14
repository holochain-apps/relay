<script lang="ts">
  import { getContext } from 'svelte';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
</script>

<Header>
  <Avatar size={24} agentPubKey={relayStore.client.myPubKey} placeholder={true} showNickname={false} moreClasses='absolute' />
  <div class='absolute right-5 flex items-center'>
    <a href='/conversations/join'><SvgIcon icon='ticket' size='24' color='white'/></a>
    <a href='/share-key' class='ml-5'><SvgIcon icon='key' size='24' color='white'/></a>
    <a href='/conversations/new' class='ml-5'><SvgIcon icon='newConversation' size='22' color='white'/></a>
  </div>
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
        <span class='text-xs text-surface-200 flex flex-row items-center'>
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