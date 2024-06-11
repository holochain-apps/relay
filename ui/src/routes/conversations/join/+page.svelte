<script lang="ts">
	import { decode } from '@msgpack/msgpack';
  import { Base64 } from 'js-base64';
  import { getContext, onMount } from 'svelte';
	import { encodeHashToBase64 } from "@holochain/client";
  import { goto } from '$app/navigation';
	import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { copyToClipboard } from '$lib/utils';
  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';
  import type { Invitation } from '../../../types';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let inviteCode = ''

  async function joinConversation(e: SubmitEvent) {
    e.preventDefault();
    const msgpack = Base64.toUint8Array(inviteCode)
    try {
      const invitation : Invitation = decode(msgpack) as Invitation;
      const conversation = await relayStore.joinConversation(invitation)
      conversation && goto(`/conversations/${conversation.data.id}`)
    } catch(e) {
      alert(`error decoding invitation: ${e}`)
    }
  }
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">Join Conversation</h1>
</Header>

<form on:submit={joinConversation} class='contents'>
  <div class="container mx-auto flex flex-col justify-center items-start grow px-10">
    <h1 class='h1'>Enter invite code</h1>
    <input
      class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0 w-full text-ellipsis overflow-hidden'
      type='text'
      placeholder='e.g. 4xx89huihify87y...'
      name='inviteCode'
      bind:value={inviteCode}
    />
  </div>

  <footer>
    <Button>
      <SvgIcon icon='speechBubble' size='20' /> <strong class='ml-2'>Join Conversation</strong>
    </Button>
  </footer>
</form>