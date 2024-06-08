<script lang="ts">
	import { getContext } from 'svelte';
  import { encode } from '@msgpack/msgpack';
  import { Base64 } from 'js-base64';
  import { type AgentPubKey, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import { type Invitation } from '../../../../types'

	$: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  $: conversation = relayStore.getConversation(conversationId);

  $: publicKey = ''
  $: validKey = publicKey.length > 0 && decodeHashFromBase64(publicKey).length === 39

  const createInviteCode = async () => {
    if (!conversation) return
    const agent: AgentPubKey = decodeHashFromBase64(publicKey)
    const proof = await relayStore.inviteAgentToConversation(conversationId, agent)
    if (proof !== undefined) {
      const invitation: Invitation = {
        conversationName: conversation.data.name,
        progenitor: conversation.data.progenitor,
        proof,
        networkSeed: conversation.data.networkSeed
      }
      const msgpck = encode(invitation);
      const inviteCode = Base64.fromUint8Array(msgpck);
      console.log("conversation invite",conversation.data.name, conversation.data.progenitor, conversation.data.networkSeed, inviteCode)
      goto(`/conversations/${conversationId}/invite/show?agentKey=${publicKey}&inviteKey=${encodeURIComponent(inviteCode)}`)
    }
    else {
      alert("Unable to create invitation code")
    }
  }
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}>
    <SvgIcon icon='back' color='white' size='10' />
  </button>
  <h1 class="flex-1 text-center">Create personal invite</h1>
</Header>

{#if conversation}
  <h1 class='text-4xl flex-shrink-0 mt-10'>{@html conversation.data.name}</h1>

  <div class="container mx-auto flex flex-col justify-center items-start grow px-10">
    <h1 class='h1 mb-2'>Recipient's public key</h1>
    <input
      class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0 w-full text-nowrap overflow-hidden text-ellipsis'
      type='text'
      placeholder="Paste public key here"
      name='publicKey'
      bind:value={publicKey}
    />
    <span class='text-error-400 pl-0.5'>{publicKey.length > 0 && !validKey ? 'Invalid public key' : ''}</span>
  </div>

  <footer>
    <Button onClick={createInviteCode} disabled={!validKey}>
      <SvgIcon icon='person' size='16' />
      <strong class='ml-2'>Generate personal invite code</strong>
    </Button>
  </footer>
{/if}