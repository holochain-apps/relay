<script lang="ts">
	import '../app.postcss';

	import { type AppClient, AppWebsocket, AdminWebsocket, type AppWebsocketConnectionOptions } from '@holochain/client';
	import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';

	import { goto } from '$app/navigation';

	import { onMount, setContext } from 'svelte';
  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';

	//	export let data: LayoutData;

	const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'relay'
	// const roleName = 'relay'
	const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
	const adminPort = import.meta.env.VITE_ADMIN_PORT
	const url = `ws://localhost:${appPort}`;

	let client: AppWebsocket
	let relayClient: RelayClient
	let relayStore: RelayStore
	let connected = false
	//let profilesStore : ProfilesStore | Writable<null> = writable(null)
	let profilesStore : ProfilesStore|null = null

	onMount(() => {
		async function initHolochain() {
			let tokenResp
			if (adminPort) {
				const adminWebsocket = await AdminWebsocket.connect({ url: new URL(`ws://localhost:${adminPort}`) })
				tokenResp = await adminWebsocket.issueAppAuthenticationToken({installed_app_id:appId})
				const x = await adminWebsocket.listApps({})
				console.log("apps", x)
				const cellIds = await adminWebsocket.listCellIds()
				console.log("CELL IDS",cellIds)
				await adminWebsocket.authorizeSigningCredentials(cellIds[0])
			}
			console.log("appPort and Id is", appPort, appId)
			const params: AppWebsocketConnectionOptions = {url: new URL(url)}
			if (tokenResp) params.token = tokenResp.token
			client = await AppWebsocket.connect(params)
			let profilesClient = new ProfilesClient(client, appId);
			profilesStore = new ProfilesStore(profilesClient);
			relayClient = new RelayClient(client, "relay", profilesStore);
			relayStore = new RelayStore(relayClient)
			await relayStore.initialize()
			connected = true
			console.log("connected. profiles store", profilesStore)
		}

		initHolochain()

		// Prevent internal links from opening in the browser when using Tauri
		const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
			// Ensure the clicked element is an anchor and has a href attribute
			if (target.closest('a[href]')) {
        const anchor = target.closest('a') as HTMLAnchorElement;
				// Prevent default action if it's an internal link
				if (anchor && anchor.origin === window.location.origin) {
					event.preventDefault();
					event.stopPropagation();
					goto(anchor.pathname); // Navigate internally using SvelteKit's goto
				} else if (anchor) {
					// Handle external links using Tauri's API
					event.preventDefault();
					window.__TAURI__.shell.open(anchor.href);
				}
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
	})

	setContext('relayClient', {
    getClient: () => relayClient
  });

	setContext('profiles', {
    getStore: () => profilesStore
  });

	setContext('relayStore', {
    getStore: () => relayStore
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
					on:profile-created={(a) => { console.log("profile created", a)}}
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