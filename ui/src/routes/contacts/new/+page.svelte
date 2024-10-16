<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { goto } from '$app/navigation';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import ContactEditor from "../ContactEditor.svelte";
  import { scanStore } from "$store/ScanStore";

  let agentPubKeyB64: string | null = null;

  function loadScanResult() {
    agentPubKeyB64 = scanStore.readResult();
  }
  loadScanResult();
</script>

<Header>
  <button class='absolute z-10 text-4xl pr-5' on:click={() => goto('/create')}>
    <SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' />
  </button>
  <h1 class="flex-1 text-center">{$t('contacts.create_new_contact')}</h1>
  <div class="absolute right-0">
    <button class='z-10 text-4xl mr-5' on:click={() => scanStore.scan()}>
      <SvgIcon icon='qrCodeScan' color={$modeCurrent ? '%232e2e2e' : 'white'} size='30' />
    </button>
  </div>
</Header>

<ContactEditor editContactId={agentPubKeyB64} isNewContact={true} />