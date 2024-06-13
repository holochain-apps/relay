<script lang="ts">
	import { goto } from '$app/navigation';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { page } from '$app/stores';
  import type { RelayStore } from '$store/RelayStore';
  import { getContext } from 'svelte';
  import { decodeHashFromBase64 } from '@holochain/client';
  import Avatar from '$lib/Avatar.svelte';

  $: conversationId = $page.params.id;
  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  $: conversation = relayStore.getConversation(conversationId);

</script>

<Header>
  <a class='absolute' href={`/conversations/${conversationId}`}><SvgIcon icon='caretLeft' color='white' size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">Members</h1>
    <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
  {/if}
</Header>


{#if conversation}
  {@const numMembers = Object.values(conversation.data.agentProfiles).length}

  <div class="container mx-auto flex items-center flex-col flex-1 overflow-hidden w-full pt-10">
    {#if conversation.data.config.image}
      <img src={conversation.data.config.image} alt='Conversation' class='w-32 h-32 min-h-32 mb-5 rounded-full object-cover' />
    {/if}
    <h1 class='text-4xl flex-shrink-0'>{@html conversation.data.config.title}</h1>
    <p class='text-surface-300'>{@html numMembers } {#if numMembers === 1}Member{:else}Members{/if}</p>

    <div class="container mx-auto flex flex-col px-4">
      <ul class="flex-1 mt-10">
        {#each Object.entries(conversation.data.agentProfiles) as [agentPubKey, profile]}
          <li class='text-xl flex flex-row mb-5 items-center'>
            <Avatar agentPubKey={decodeHashFromBase64(agentPubKey)} size='48' showNickname={false} moreClasses='-ml-30'/>
            <span style="margin-left:15px; font-size:20px">{profile.nickname}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}