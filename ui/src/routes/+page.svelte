<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
	import Header from '$lib/Header.svelte';
  import type { UserStore } from "$store/UserStore";
	import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";

	const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
	let profilesStore = profilesContext.getStore()
	// $: myProfile = profilesStore ? profilesStore.myProfile : null
	$: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	$: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as any
  $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""


	// Retrieve user store from context
	//const userStore: UserStore = getContext('user');
	// $: userName = profilesStore.myProfile.name
	// let newUserName = "";
	// function submitName(e: MouseEvent) {
  //   newUserName = newUserName.trim();
	// 	if (newUserName) {
  //     // userStore.login(newUserName)
  //     newUserName = ''; // Clear input after sending
  //   }
  //   e.preventDefault();
  // }
</script>

<Header>
	<img src="/logo.png" alt="Logo" />
</Header>

<div class="container mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1">Relay</h1>
		<p>Welcome, {userName}!</p>
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
