<script lang="ts">
	import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
	import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { t } from '$lib/translations';

  import { RelayClient } from '$store/RelayClient';
  import { RelayStore } from '$store/RelayStore';

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

	const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  $: if (relayStore.conversationsData.length > 0) {
    goto('/conversations')
  }
</script>

<Header>
  <button on:click={() => goto('/account')}>
    <Avatar size={24} agentPubKey={relayClient.myPubKey} />
  </button>

  <button on:click={() => goto('/create')} class='absolute right-4'>
    <SvgIcon icon='plusCircle' size='24' />
  </button>
</Header>

<div class="container mx-auto flex flex-col justify-center items-start grow px-10">
  <SvgIcon icon='hand' size='32' />
  <h1 class='h1'>{$t('common.welcome')}</h1>
  <p class='mb-5'>{$t('common.welcome_text_1')}</p>
  <p>{$t('common.welcome_text_2')}</p>
</div>

<footer class='px-10 pb-10 flex justify-between w-full gap-4'>
  <button
    class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
    on:click={() => goto('/conversations/join')}
  >
    <SvgIcon icon='ticket' size='32' color='red' moreClasses='flex-grow' />
    <p class=''>{$t('common.use_invite_code')}</p>
  </button>

  <button
    class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
    on:click={() => goto('/contacts/new')}
  >
    <SvgIcon icon='newPerson' size='32' color='red' moreClasses='flex-grow' />
    <p>{$t('common.new_contact')}</p>
  </button>

  <button
    class='w-28 h-24 bg-surface-500 text-xs text-primary-700 rounded-2xl py-2 flex flex-col items-center disabled:opacity-50'
    on:click={() => goto('/conversations/new')}
  >
    <SvgIcon icon='people' size='32' color='red' moreClasses='flex-grow'/>
    <p>{$t('common.new_group')}</p>
  </button>
</footer>
