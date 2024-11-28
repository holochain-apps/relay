<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext, onMount } from "svelte";
  import { QRCodeImage } from "svelte-qrcode-image";
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { copyToClipboard, handleFileChange, isMobile, shareText } from "$lib/utils";
  import { RelayClient } from "$store/RelayClient";
  import { ProfilesStore } from "@holochain-open-dev/profiles";
  import { get } from "svelte/store";

	const relayClientContext: { getClient: () => RelayClient } = getContext('relayClient')
	let relayClient = relayClientContext.getClient()

  const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
  let profilesStore = profilesContext.getStore()
	$: prof = profilesStore ? profilesStore.myProfile : undefined
  $: profileData = $prof?.status === 'complete' ? $prof.value?.entry : undefined

	const agentPublicKey64 = relayClient.myPubKeyB64

  const MIN_FIRST_NAME_LENGTH = 3;

  $: firstName = profileData?.fields.firstName || '';
  $: lastName = profileData?.fields.lastName || ''

  let editingName = false
  let firstNameElem: HTMLInputElement
  let lastNameElem: HTMLInputElement

  $: saveName = async () => {
    if (profileData && firstNameElem.value?.length >= MIN_FIRST_NAME_LENGTH) {
      firstName = firstNameElem.value
      lastName = lastNameElem.value
      await relayClient.updateProfile(firstName, lastName, profileData.fields.avatar)
      editingName = false
    }
  }

  $: cancelEditName = () => {
    editingName = false;
    firstName = profileData?.fields.firstName || "";
    lastName = profileData?.fields.lastName || "";
  };

  onMount(() => {
    // Trigger refetching profile if not already in profilesStore
    get(profilesStore.myProfile);
  });
</script>

<Header>
  <button class='text-4xl pr-5' on:click={() => history.back()}><SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' /></button>
</Header>

{#if $prof && $prof.status === 'complete' && $prof.value}
<div class='flex flex-col grow items-center w-full pt-10' >

  <!-- Hidden file input -->
  <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" class='hidden'
    on:change={(event) => handleFileChange(event,
      (imageData) => {
        relayClient.updateProfile(firstName, lastName, imageData)
      }
    )}
  />
  <div style="position:relative">
    <Avatar agentPubKey={relayClient.myPubKey} size='128' moreClasses='mb-4'/>
    <label for="avatarInput"
      class='rounded-full w-12 h-12 pl-1 bottom-5 right-0 bg-tertiary-500 hover:bg-secondary-300 dark:bg-secondary-500 dark:hover:bg-secondary-400 absolute flex items-center justify-center cursor-pointer'
    >
      <SvgIcon icon='image' color={$modeCurrent ? '%232e2e2e' : 'white'} size='26' />
    </label>
  </div>

  {#if editingName}
    <div class="flex flex-row items-center justify-center">

      <input
        autofocus
        class='text-3xl max-w-40 text-start bg-surface-900 border-none outline-none focus:outline-none pl-0.5 pt-0 focus:ring-0'
        type='text'
        placeholder={$t('common.first') + ' *'}
        name='firstName'
        bind:this={firstNameElem}
        value={firstName}
        minlength={MIN_FIRST_NAME_LENGTH}
        on:keydown={(event) => {
          if (event.key === 'Escape') cancelEditName();
        }}
      />
      <input
        class='text-3xl max-w-40 text-start bg-surface-900 border-none outline-none focus:outline-none pl-0.5 pt-0 focus:ring-0'
        type='text'
        placeholder={$t('common.last')}
        name='lastName'
        bind:this={lastNameElem}
        value={lastName}
        on:keydown={(event) => {
          if (event.key === 'Enter') saveName();
          if (event.key === 'Escape') cancelEditName();
        }}
      />
      <Button
        moreClasses="h-6 w-6 rounded-md py-0 !px-0 mb-0 mr-2 bg-primary-100 flex items-center justify-center"
        onClick={() => saveName()}
      >
        <SvgIcon icon='checkMark' color='%23FD3524' size='12' />
      </Button>
      <Button
        moreClasses="h-6 w-6 !px-0 py-0 mb-0 rounded-md bg-surface-400 flex items-center justify-center"
        onClick={() => cancelEditName()}
      >
        <SvgIcon icon='x' color='gray' size='12' />
      </Button>
    </div>
  {:else}
    <div class="flex row items-center justify-center mb-10">
      <h1 class='text-3xl flex-shrink-0 mr-2'>{firstName} {lastName}</h1>

      <button on:click={() => editingName = true}>
        <SvgIcon icon='write' size='24' color='gray' moreClasses='cursor-pointer' />
      </button>
    </div>
  {/if}

  <QRCodeImage text={agentPublicKey64} width={7} />

  <p class='w-64 text-nowrap overflow-hidden text-ellipsis mt-8 text-secondary-400 dark:text-tertiary-700 mb-4'>{agentPublicKey64}</p>

  <Button onClick={() => copyToClipboard(agentPublicKey64)} moreClasses='w-64 text-sm variant-filled-tertiary dark:!bg-tertiary-200'>
    <SvgIcon icon='copy' size='22' color='%23FD3524' moreClasses='mr-3' />
    <strong>{$t('common.copy_your_contact_code')}</strong>
  </Button>
  {#if isMobile()}
    <Button onClick={() => shareText(agentPublicKey64)} moreClasses='w-64 text-sm variant-filled-tertiary dark:!bg-tertiary-200'>
      <SvgIcon icon='share' size='22' color='%23FD3524' moreClasses='mr-3' />
      <strong>{$t('common.share_your_contact_code')}</strong>
    </Button>
  {/if}
</div>
{/if}