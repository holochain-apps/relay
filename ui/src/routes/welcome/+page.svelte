<script lang="ts">
	import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
	import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

	const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  $: if (relayStore.conversationsData.length > 0) {
    goto('/conversations')
  }
</script>

<Header>
	<!-- <img src="/logo.png" alt="Logo" /> -->
  <Avatar size={24} agentPubKey={relayClient.myPubKey} placeholder={true} showNickname={false} />
</Header>

<div class="container mx-auto flex flex-col justify-center items-start grow px-10">
  <SvgIcon icon='hand' size='32' />
  <h1 class='h1'>Welcome</h1>
  <p class='mb-5'>On Relay, your data is only shared with the people you message with.</p>
  <p>Private, encrypted and secured by keys only you control.</p>
</div>

<footer>
  <Button onClick={() => goto('/conversations/join')} moreClasses='w-64 justify-center'>
    <SvgIcon icon='ticket' size='24' />
    <strong class='ml-2'>Enter Invite Code</strong>
  </Button>

  <Button onClick={() => goto('/share-key')} moreClasses='w-64 justify-center'>
    <SvgIcon icon='key' size='24' />
    <strong class='ml-2'>Share your public key</strong>
  </Button>

  <Button onClick={() => goto('/conversations/new')} moreClasses='w-64 justify-center'>
    <SvgIcon icon='write' size='24' />
    <strong class='ml-2'>New Conversation</strong>
  </Button>
</footer>
