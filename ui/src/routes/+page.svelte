<script lang="ts">
	import { ProfilesStore } from '@holochain-open-dev/profiles';
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
	import { modeCurrent } from '@skeletonlabs/skeleton';
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/Header.svelte';
	import SvgIcon from '$lib/SvgIcon.svelte';
	import { t } from '$lib/translations';
	import { RelayStore } from '$store/RelayStore';

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
</Header>

{#if !loggedIn}
	<div class='flex flex-col items-center justify-center grow'>
		<img src="/icon.png" alt="Icon" width='58' class='mb-4' />
		<h1 class="text-2xl font-bold">{$t('common.app_name')}</h1>
		<span class='text-xs flex mt-3'>v{__APP_VERSION__}<SvgIcon icon='betaTag' size='24' moreClasses='ml-1' color={$modeCurrent ? '#000' : '#fff'} /></span>
		<p class='mt-10'>{$t('common.tagline')}</p>
	</div>
	{#if $prof && $prof.status === 'pending'}
		<div class="flex flex-col items-center justify-center">
			<p class="mb-8">{$t('connecting_to_holochain')}</p>
		</div>
	{:else if $prof && $prof.status === 'error'}
		<div class="flex flex-col items-center justify-center">
			<p class="text-2xl">{$t("common.profile_error")}: {$prof.error}</p>
		</div>
	{:else}
		<a class='variant-filled-tertiary dark:variant-filled-tertiary rounded-full flex items-center px-6 py-3 mb-8' href="/register">
			<SvgIcon icon='lock' size='24' color='%23fd3524' /> <span class='ml-2'>{$t('common.create_an_account')}</span>
		</a>
	{/if}
	<div class="flex flex-col items-center justify-center pb-10">
		<p class='text-xs mb-2'>{$t('common.secured_by')}</p>
		<img class='max-w-52'src={$modeCurrent ? '/holochain-charcoal.png' : '/holochain-white.png'} alt="holochain" />
	</div>
{/if}
