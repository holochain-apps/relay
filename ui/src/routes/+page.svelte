<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
	import { type AgentPubKey, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
	import { type Profile, ProfilesStore } from '@holochain-open-dev/profiles';
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
	import { EntryRecord, LazyHoloHashMap, ZomeClient } from '@holochain-open-dev/utils';
	import { copyToClipboard } from '$lib/utils';
	import Header from '$lib/Header.svelte';
	import Avatar from '$lib/Avatar.svelte';
  import { RelayClient } from '$store/RelayClient';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()
	const agentPublicKey64 = encodeHashToBase64(relayClient.myPubKey())

	// const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
	// let profilesStore = profilesContext.getStore()
	// $: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	// $: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as EntryRecord<Profile>
  // $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""
</script>

<Header>
	<img src="/logo.png" alt="Logo" />
</Header>

<div class="container mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1">Relay</h1>
		<p class='flex'>
			Welcome, &nbsp; <Avatar size={24} agentPubKey={relayClient.myPubKey()} placeholder={true} />
			<button on:click={() => copyToClipboard(agentPublicKey64)} class='ml-2'>
				<img src="/copy.svg" alt="Copy Icon" width='16' />
			</button>
		</p>
		<a class="anchor" href="/conversations">
			Conversations
		</a>

		<!-- {#if $userName}
			<p>Welcome, {$userName}!</p>
			<a class="anchor" href="/conversations">
				Conversations
			</a>
		{:else}
			<p>Create an Account</p>
			<input type="text" placeholder="Enter your display name" bind:value={newUserName} />
			<button on:click={submitName}>Submit</button>
		{/if} -->
	</div>
</div>
