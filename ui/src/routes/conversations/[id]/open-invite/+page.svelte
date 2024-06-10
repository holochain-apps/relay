<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
  import { encode } from '@msgpack/msgpack';
  import { Base64 } from 'js-base64';
  import { type AgentPubKey, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
  import { page } from '$app/stores';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { copyToClipboard } from '$lib/utils';
  import type { UserStore } from "$store/UserStore";
	import { ProfilesStore } from '@holochain-open-dev/profiles';
  import { RelayStore } from '$store/RelayStore';
  import { type Invitation } from '../../../../types'

	$: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()

  $: conversation = relayStore.getConversation(conversationId);

  let inviteAgent = '';
  let inviteCode : string;

  const createInviteCode = async () => {
    if (!conversation) return
    const agent: AgentPubKey = decodeHashFromBase64(inviteAgent)
    const proof = await relayStore.inviteAgentToConversation(conversationId, agent)
    if (proof !== undefined) {
      const invitation: Invitation = {
        conversationName: conversation.data.config.title,
        progenitor: conversation.data.progenitor,
        proof,
        networkSeed: conversation.data.id
      }
      const msgpck = encode(invitation);
      inviteCode = Base64.fromUint8Array(msgpck);
      copyToClipboard(inviteCode)
      alert("Invitation code copied to clipboard")
    }
    else {
      alert("Unable to create invitation code")
    }
  }
</script>

{#if conversation}
<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='back' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">Add Members</h1>
</Header>

<div class="container mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1">{conversation.data.config.title}</h1>
    <p>Invite members to this conversation</p>
    <div class='max-w-sm'>
      <p class='overflow-hidden text-ellipsis'>Public Invite Code: {conversation.publicInviteCode}</p>
      <button on:click={() => copyToClipboard(conversation.publicInviteCode)} class='ml-2'>
				<img src="/copy.svg" alt="Copy Icon" width='16' />
			</button>
    </div>
    <div class='max-w-sm'>
      Invite Agent: <input type="text" placeholder="Enter agent public key" bind:value={inviteAgent} />
      <button on:click={createInviteCode}>Invite</button>
      {#if inviteCode}
        <p class='overflow-hidden text-ellipsis'>Invite code: {inviteCode}</p>
      {/if}
    </div>
	</div>
</div>
{/if}