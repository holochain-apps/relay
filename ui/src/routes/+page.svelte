<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
	import { goto } from '$app/navigation';
	import { type AgentPubKey, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
	import { type Profile, ProfilesStore } from '@holochain-open-dev/profiles';
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
	import Avatar from '$lib/Avatar.svelte';
	import Header from '$lib/Header.svelte';
	import SvgIcon from '$lib/SvgIcon.svelte';
	import { RelayStore } from '$store/RelayStore';
  import { invoke } from '@tauri-apps/api/core';

	const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
	let profilesStore = profilesContext.getStore()
	$: prof = profilesStore ? profilesStore.myProfile : undefined
	$: loggedIn = $prof && $prof.status == "complete" && $prof.value !== undefined

	const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

	$: if (loggedIn) {
		if (relayStore.conversationsData.length > 0) {
			goto('/conversations')
		}
		goto('/welcome')
	}
</script>

<Header>
	<img src="/logo.png" alt="Logo" />
</Header>

{#if !loggedIn}
	<div class='flex flex-col items-center justify-center grow'>
		<img src="/logo.png" alt="Logo" />
		<h1 on:click={ ()=>{
			console.log("HERE")
			 invoke('close_splashscreen')}} class="h1">Relay</h1>
		<span class='text-xs mb-10'>v{__APP_VERSION__}</span>
		<p>Peer-to-peer. Encrypted. Secure.</p>
	</div>
	{#if $prof && $prof.status === 'pending'}
		<div class="flex flex-col items-center justify-center">
			<p class="text-2xl mb-8">Connecting to Holochain...</p>
		</div>
	{:else if $prof && $prof.status === 'error'}
		<div class="flex flex-col items-center justify-center">
			<p class="text-2xl">Error when loading profile: {$prof.error}</p>
		</div>
	{:else}
		<a class='bg-primary-50 text-surface-900 rounded-full flex items-center px-5 py-2 mb-8' href="/register">
			<SvgIcon icon='lock' size='24' /> <span class='ml-2'>Create an Account</span>
		</a>
	{/if}
	<div class="flex flex-col items-center justify-center">
		<p class='text-surface-300 text-xs'>SECURED BY</p>
		<img src='/holochain.png' alt="holochain" />
	</div>
{/if}