<script lang="ts">
	import '../app.postcss';

	import { type AppClient, AppWebsocket, AdminWebsocket, type AppWebsocketConnectionOptions } from '@holochain/client';
	import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';

	import '../app.postcss';

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

	$: prof = profilesStore ? profilesStore.myProfile : undefined

	setContext('relayClient', {
    getClient: () => relayClient
  });

	setContext('profiles', {
    getStore: () => profilesStore
  });

	setContext('relayStore', {
    getStore: () => relayStore
  });

</script>

<div class="wrapper flex flex-col mx-auto px-5 py-4 h-screen items-center">
	{#if !connected || ($prof && $prof.status === 'pending')}
		<div class='flex flex-col items-center justify-center grow'>
			<img src="/logo.png" alt="Logo" />
			<h1 class="h1">Relay</h1>
			<span class='text-xs mb-10'>v{__APP_VERSION__}</span>
			<p>Peer-to-peer. Encrypted. Secure.</p>
		</div>
		<div class="flex flex-col items-center justify-center">
			<p class="text-2xl mb-8">Connecting to Holochain...</p>
		</div>
		<div class="flex flex-col items-center justify-center">
			<p class='text-surface-300 text-xs'>SECURED BY</p>
			<img src='/holochain.png' alt="holochain" />
		</div>
	{:else}
		<slot />
	{/if}
</div>

<style>
	.wrapper {
		max-width: 1000px;
		margin: 0 auto;
	}
</style>