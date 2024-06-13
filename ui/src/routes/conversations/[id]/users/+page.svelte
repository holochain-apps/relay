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
    <h1 class="flex-1 grow text-center">{@html conversation.data.config.title}: Members</h1>
    <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
  {/if}
</Header>

{#if conversation}
  {#each Object.entries(conversation.data.agentProfiles) as [agentPubKey, profile]}
    <Avatar agentPubKey={decodeHashFromBase64(agentPubKey)} size='24' showNickname={true} moreClasses='-ml-30'/>
  {/each}
{/if}