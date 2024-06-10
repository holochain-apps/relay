<script lang="ts">
	import { getContext } from 'svelte';
  import { encode } from '@msgpack/msgpack';
  import { Base64 } from 'js-base64';
  import { type AgentPubKey, decodeHashFromBase64 } from "@holochain/client";
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import { copyToClipboard } from '$lib/utils';
  import { type Invitation, Privacy } from '../../../../types'

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
        privacy: conversation.data.privacy,
        proof,
        networkSeed: conversation.data.networkSeed
      }
      const msgpck = encode(invitation);
      const inviteCode = Base64.fromUint8Array(msgpck);
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
  <h1 class="flex-1 text-center">{#if conversation}{@html conversation.data.name}{/if}</h1>
</Header>

{#if conversation}
  {#if conversation.data.privacy === Privacy.Private}
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
  {:else}
    <div class="container mx-auto flex flex-col justify-center items-center grow px-10">
      <img src='/share-public-invite.png' alt="Share Key" class='mb-4'/>
      <h1 class='h1 mb-2'>Open invite code</h1>
      <p class='mb-5'>Share with people to begin chatting!</p>
    </div>

    <footer>
      <Button onClick={() => copyToClipboard(conversation.publicInviteCode)} moreClasses='w-64'>
        <p class='w-64 text-nowrap overflow-hidden text-ellipsis'>{conversation.publicInviteCode}</p>
        <img src="/copy.svg" alt="Copy Icon" width='16' /><span class='text-xs text-tertiary-200'>COPY</span>
      </Button>
      <Button moreClasses='bg-surface-400 text-secondary-50 w-64 justify-center' onClick={() => goto(`/conversations/${conversationId}`)}>Done</Button>
    </footer>
  {/if}
{/if}