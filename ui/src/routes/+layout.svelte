<script lang="ts">
	import { AppWebsocket, AdminWebsocket, type AppWebsocketConnectionOptions } from '@holochain/client';
	import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
	import { modeCurrent, setModeCurrent } from '@skeletonlabs/skeleton';
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/translations';
	import { RelayClient } from '$store/RelayClient';
	import { RelayStore } from '$store/RelayStore';

	import '../app.postcss';

	//	export let data: LayoutData;

	const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'relay'
	const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
	const adminPort = import.meta.env.VITE_ADMIN_PORT
	const url = `ws://localhost:${appPort}`;

	let client: AppWebsocket
	let relayClient: RelayClient
	let relayStore: RelayStore
	let connected = false
	let profilesStore : ProfilesStore|null = null

	let appHeight: number;

	function updateAppHeight() {
		appHeight = window.innerHeight;
		document.documentElement.style.setProperty('--app-height', `${appHeight}px`);
  }

	document.addEventListener('DOMContentLoaded', () => {
	// This will wait for the window to load, but you could
	// run this function on whatever trigger you want
	//invoke('close_splashscreen')
	})

	onMount(() => {
		async function initHolochain() {
			// console.log("FISH", window.__TAURI__)
			 //await invoke('close_splashscreen')

			let tokenResp
			if (adminPort) {
				const adminWebsocket = await AdminWebsocket.connect({ url: new URL(`ws://localhost:${adminPort}`) })
				tokenResp = await adminWebsocket.issueAppAuthenticationToken({installed_app_id:appId})
				const x = await adminWebsocket.listApps({})
				const cellIds = await adminWebsocket.listCellIds()
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
			console.log("Connected")
		}

		initHolochain()

		// To change from light mode to dark mode based on system settings
		// XXX: not using the built in skeleton autoModeWatcher() because it doesn't set modeCurrent in JS which we use
		const mql = window.matchMedia('(prefers-color-scheme: light)');
		function setMode(value: boolean) {
			const elemHtmlClasses = document.documentElement.classList;
			const classDark = `dark`;
			value === true ? elemHtmlClasses.remove(classDark) : elemHtmlClasses.add(classDark);
			setModeCurrent(value)
		}
		setMode(mql.matches);
		mql.onchange = () => {
			setMode(mql.matches)
		}

		// Prevent internal links from opening in the browser when using Tauri
		const handleLinkClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			// Ensure the clicked element is an anchor and has a href attribute
			if (target.closest('a[href]')) {
				// Prevent default action
				event.preventDefault();
				event.stopPropagation();

        const anchor = target.closest('a') as HTMLAnchorElement;
				let link = anchor.getAttribute('href')
				if (anchor && anchor.href.startsWith(window.location.origin) && !anchor.getAttribute('rel')?.includes('noopener')) {
					return goto(anchor.pathname); // Navigate internally using SvelteKit's goto
				} else if (anchor && link) {
					// Handle external links using Tauri's API
					if (!link.includes('://')) {
						link = `https://${link}`
					}
					const { open } = window.__TAURI_PLUGIN_SHELL__
					open(link)
				}
      }
    };

		setTimeout(updateAppHeight, 300)
		window.addEventListener('resize', updateAppHeight);

    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
			window.removeEventListener('resize', updateAppHeight);
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

<div class="wrapper flex flex-col mx-auto px-5 py-4 h-screen items-center full-screen">
	{#if !connected || ($prof && $prof.status === 'pending')}
		<div class='flex flex-col items-center justify-center grow'>
			<svg width="125" height="142" viewBox="0 0 125 142" xmlns="http://www.w3.org/2000/svg">
				<path d="M10.992 115.176V129H3.36V92.808H14.064C22.032 92.808 27.744 96.888 27.744 103.992C27.744 109.08 24.576 112.68 19.776 114.264L31.2 129H21.984L11.664 115.176H10.992ZM10.992 99.144V109.32H13.92C17.424 109.32 19.968 107.592 19.968 104.184C19.968 100.872 17.424 99.144 13.92 99.144H10.992ZM43.0995 123.624C45.9315 123.624 47.5155 122.28 48.9075 120.12L54.0435 123.672C51.7395 127.464 47.7555 129.576 43.0995 129.576C36.2835 129.576 30.4755 124.2 30.4755 116.952C30.4755 109.656 36.2835 104.328 42.9075 104.328C50.7795 104.328 55.4355 110.568 54.9555 118.92H37.2435C37.9635 121.896 40.3155 123.624 43.0995 123.624ZM42.9555 110.232C40.5075 110.232 38.3475 111.768 37.4835 114.36H48.0435C47.7075 112.296 46.0755 110.232 42.9555 110.232ZM58.1464 90.312H65.4424V129H58.1464V90.312ZM87.885 104.904H95.181V129H87.885V126.12C86.445 127.992 83.709 129.576 80.397 129.576C73.821 129.576 68.493 124.152 68.493 116.952C68.493 109.752 73.821 104.328 80.397 104.328C83.709 104.328 86.445 105.912 87.885 107.784V104.904ZM75.741 116.952C75.741 120.552 78.381 123.288 81.933 123.288C85.437 123.288 88.077 120.552 88.077 116.952C88.077 113.352 85.437 110.616 81.933 110.616C78.381 110.616 75.741 113.352 75.741 116.952ZM97.9001 141.048L106.972 124.248L96.4601 104.904H104.476L110.812 116.904L116.812 104.904H124.54L105.532 141.048H97.9001Z" fill={$modeCurrent ? 'black' : 'white'} />
				<path fill-rule="evenodd" clip-rule="evenodd" d="M52.006 12.7412C50.9181 13.5016 50 14.6201 50 15.9473L50 23.0527C50 24.3799 50.9181 25.4984 52.006 26.2588C52.6811 26.7308 53.2692 27.3189 53.7412 27.994C54.5016 29.0819 55.6201 30 56.9473 30H58.0527C59.3799 30 60.4984 29.0818 61.2589 27.994C62.5243 26.1839 64.6239 25 67 25C67.4092 25 67.8002 24.7965 67.9922 24.4351L74.0808 12.9714C74.4991 12.1837 74.3592 11.2405 73.917 10.466C73.4497 9.64767 72.6438 9 71.7014 9H56.9473C55.6201 9 54.5016 9.91815 53.7412 11.006C53.2692 11.6811 52.6811 12.2692 52.006 12.7412ZM46 23.0527C46 24.3799 45.0818 25.4984 43.994 26.2589C42.1839 27.5243 41 29.6239 41 32C41 34.3761 42.1839 36.4757 43.994 37.7411C45.0818 38.5016 46 39.6201 46 40.9473L46 48.0527C46 49.3799 45.0818 50.4984 43.994 51.2589C42.1839 52.5243 41 54.6239 41 57C41 60.866 44.134 64 48 64C51.866 64 55 60.866 55 57C55 54.6239 53.8161 52.5243 52.006 51.2589C50.9182 50.4984 50 49.3799 50 48.0527L50 40.9473C50 39.6201 50.9181 38.5016 52.0059 37.7412C52.4811 37.409 52.9131 37.0193 53.2919 36.5823C54.0504 35.7071 55.0644 35 56.2225 35H58.7775C59.9356 35 60.9496 35.7071 61.7081 36.5823C62.9916 38.0633 64.8864 39 67 39C67.8766 39 68.754 39.3788 69.1658 40.1527L74.2398 49.6873C74.89 50.9092 74.5523 52.3915 73.8792 53.601C73.3191 54.6074 73 55.7665 73 57C73 60.866 76.134 64 80 64C83.866 64 87 60.866 87 57C87 53.134 83.866 50 80 50C79.3842 50 78.7838 49.7115 78.4945 49.1678L73.0147 38.8707C72.3978 37.7115 72.6709 36.3095 73.26 35.1359C73.7335 34.1925 74 33.1274 74 32C74 30.6881 73.6391 29.4605 73.0112 28.411C72.2734 27.1781 71.8833 25.6363 72.5573 24.3674L77.3302 15.3809C77.8331 14.4341 78.9279 14 80 14C83.866 14 87 10.866 87 7C87 3.13401 83.866 0 80 0C77.6239 0 75.5243 1.1839 74.2589 2.99401C73.4984 4.08182 72.3799 5 71.0527 5H56.9473C55.6201 5 54.5016 4.08182 53.7411 2.99401C52.4757 1.1839 50.3761 0 48 0C44.134 0 41 3.13401 41 7C41 9.37613 42.1839 11.4757 43.994 12.7411C45.0818 13.5016 46 14.6201 46 15.9473L46 23.0527Z" fill="#FF3615"/>
			</svg>
			<span class='text-xs mb-10'>v{__APP_VERSION__}</span>
			<p>{$t('common.tagline')}</p>
		</div>
		<div class="flex flex-col items-center justify-center">
			<p class="text-2xl mb-8">{$t('common.connecting_to_holochain')}</p>
		</div>
		<div class="flex flex-col items-center justify-center pb-10">
			<p class='text-xs mb-2'>{$t('common.secured_by')}</p>
			<img class='max-w-20' src={$modeCurrent ? '/holochain-charcoal.png' : '/holochain-white.png'} alt="holochain" />
		</div>
	{:else}
		<slot />
	{/if}
</div>

<style>
  /* Add this to ensure the page doesn't scroll */
  :global(body) {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

	.wrapper {
		max-width: 1000px;
		margin: 0 auto;
		height: var(--app-height);
		overflow-y: auto;
	}

	.wrapper.full-screen {
		padding: 0;
	}
</style>
