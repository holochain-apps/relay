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
      <li class='text-xl flex flex-row mb-5'>
        <a href="/conversations/{$conversation.data.id}" class='grow flex flex-row'>
          <img src={$conversation.data.config.image} alt='Conversation' class='w-8 h-8 rounded-full mr-4 object-cover' />
          <span>{@html $conversation.data.config.title}</span>
        </a>
        <span class='text-xs text-surface-200 flex flex-row items-center'>
          <SvgIcon icon='person' size='8' color='#ccc'/> <span class='ml-2'>{Object.values($conversation.data.agentProfiles).length}</span>
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