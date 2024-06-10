<script lang="ts">
	import { getContext } from 'svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { copyToClipboard } from '$lib/utils';
  import { RelayClient } from '$store/RelayClient';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()
	const agentPublicKey64 = relayClient.myPubKeyB64()
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='back' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">Share your key</h1>
</Header>

<div class="container mx-auto flex flex-col justify-center items-center grow px-10">
  <img src='/share-public-key.png' alt="Share Key" class='mb-4'/>
  <h1 class='h1 mb-2'>Share your public key</h1>
  <p class='mb-5'>Share this key with other Relay users to generate a private invite key</p>
</div>

<footer>
  <Button onClick={() => copyToClipboard(agentPublicKey64)} moreClasses='w-64'>
    <p class='w-64 text-nowrap overflow-hidden text-ellipsis'>{agentPublicKey64}</p>
    <img src="/copy.svg" alt="Copy Icon" width='16' />
  </Button>
  <Button moreClasses='bg-surface-400 text-secondary-50 w-64 justify-center' onClick={() => history.back()}>Done</Button>
</footer>
