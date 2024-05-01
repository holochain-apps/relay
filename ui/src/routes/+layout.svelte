<script lang="ts">
	import '../app.postcss';

	import { type AppAgentClient, AppAgentWebsocket, AdminWebsocket } from '@holochain/client';
	import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';

	import { onMount, setContext } from 'svelte';
  import { RelayClient } from '$store/RelayClient';

	//	export let data: LayoutData;

	const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'relay'
	// const roleName = 'relay'
	const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
	const adminPort = import.meta.env.VITE_ADMIN_PORT
	const url = `ws://localhost:${appPort}`;

	let client: AppAgentWebsocket
	let relayClient: RelayClient
	let connected = false
	//let profilesStore : ProfilesStore | Writable<null> = writable(null)
	let profilesStore : ProfilesStore|null = null

	onMount(async () => {
		if (adminPort) {
			const adminWebsocket = await AdminWebsocket.connect({ url: new URL(`ws://localhost:${adminPort}`) })
			const x = await adminWebsocket.listApps({})
			console.log("apps", x)
			const cellIds = await adminWebsocket.listCellIds()
			console.log("CELL IDS",cellIds)
			await adminWebsocket.authorizeSigningCredentials(cellIds[0])
		}
		console.log("appPort and Id is", appPort, appId)
		client = await AppAgentWebsocket.connect(appId, { url: new URL(url) })
		let profilesClient = new ProfilesClient(client, appId);
		relayClient = new RelayClient(client, "");
		profilesStore = new ProfilesStore(profilesClient);
		connected = true
		console.log("connected. profiles store", profilesStore)
	})

	setContext('relayClient', {
    getClient: () => relayClient
  });

	setContext('profiles', {
    getStore: () => profilesStore
  });

	$: prof = profilesStore ? profilesStore.myProfile : undefined

	// const userStore = new UserStore()
	// setContext('user', userStore);
</script>

<div class="wrapper flex flex-col mx-auto p-2 h-screen items-center">
	{#if connected}
		{#if !$prof || $prof.status=="pending"}
			<div class="flex flex-col items-center justify-center h-full">
				<p class="text-2xl">
					Connecting to Holochain...
				</p>
			</div>
		{:else if $prof.status=="complete" && $prof.value == undefined}
			<h1 class="h1 mb-10"><img src="/logo.png" alt="Logo" class='inline'/>elay</h1>
			<div class="create-profile">
				<create-profile store={profilesStore}
					on:profile-created={(e) => { console.log("profile created", a)}}
				></create-profile>
			</div>
		{:else if $prof.status=="error"}
			Error when loading profile: {$prof.error}
		{:else}
			<slot />
		{/if}
	{:else}
		<div class="flex flex-col items-center justify-center h-full">
			<p class="text-2xl">
				Connecting to Holochain...
			</p>
		</div>
	{/if}
	<!-- {#if connected && $prof && $prof.status == "complete"}
		<slot />
	{:else} -->
</div>

<style>
	.wrapper {
		max-width: 1000px;
		margin: 0 auto;
	}

	.create-profile {
		padding-top: 100px;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.create-profile {
		box-shadow: 0px 10px 10px rgba(0, 0, 0, .15);
	}
</style>