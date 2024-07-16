<script lang="ts">
	import { getContext } from 'svelte';
  import { QRCodeImage } from "svelte-qrcode-image";
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { copyToClipboard } from '$lib/utils';
  import { RelayClient } from '$store/RelayClient';
	import { type Profile, ProfilesStore } from '@holochain-open-dev/profiles';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

  const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
  let profilesStore = profilesContext.getStore()
	$: prof = profilesStore ? profilesStore.myProfile : undefined

	const agentPublicKey64 = relayClient.myPubKeyB64
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
</Header>

{#if $prof && $prof.status === 'complete'}
<div class='flex flex-col grow items-center w-full pt-10' >
  <Avatar agentPubKey={relayClient.myPubKey} size='100' showNickname={false} moreClasses='mb-4'/>
  <h1 class='text-3xl flex-shrink-0 mb-10'>{@html $prof.value?.entry.nickname}</h1>

  <QRCodeImage text={agentPublicKey64} width={7} />

  <p class='w-64 text-nowrap overflow-hidden text-ellipsis mt-8 text-secondary-600 mb-4'>{agentPublicKey64}</p>
  <Button onClick={() => copyToClipboard(agentPublicKey64)} moreClasses='w-64 text-sm'>
    <SvgIcon icon='copy' size='22' color='black' moreClasses='mr-3' />
    <strong>Copy your contact code</strong>
  </Button>
</div>
{/if}