<script lang="ts">
	import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { copyToClipboard } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';

	$: conversationId = $page.params.id;
  $: agentKey = $page.url.searchParams.get('agentKey');
  $: inviteKey = $page.url.searchParams.get('inviteKey');

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  $: conversation = relayStore.getConversation(conversationId);
</script>

{#if inviteKey}
<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">{#if conversation}{@html conversation.data.config.title}{/if}</h1>
</Header>

{#if conversation}
  <h1 class='text-4xl flex-shrink-0 mt-10'>{@html conversation.data.config.title}</h1>

  <div class="container mx-auto flex flex-col justify-center items-center grow px-10">
    <img src='/share-private-invite.png' alt="Share Key" class='mb-4'/>
    <h1 class='h1 mb-2'>Personal invite key</h1>
    <p class='w-64 text-nowrap overflow-hidden text-ellipsis'>Inviting {agentKey}</p>
    <p class='mb-5'>Share with your recipient to begin chatting!</p>
  </div>

  <footer>
    <Button onClick={() => copyToClipboard(inviteKey)} moreClasses='w-64'>
      <p class='w-64 text-nowrap overflow-hidden text-ellipsis'>{inviteKey}</p>
      <img src="/copy.svg" alt="Copy Icon" width='16' /><span class='text-xs text-tertiary-200'>COPY</span>
    </Button>
    <Button moreClasses='bg-surface-400 text-secondary-50 w-64 justify-center' onClick={() => goto(`/conversations/${conversationId}`)}>Done</Button>
  </footer>
{/if}
{/if}