<script lang="ts">
  import { Base64 } from 'js-base64';
  import { encode } from '@msgpack/msgpack';
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext } from 'svelte';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { page } from '$app/stores';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import { copyToClipboard, handleFileChange, MIN_TITLE_LENGTH } from '$lib/utils';
  import type { RelayStore } from '$store/RelayStore';
  import { Privacy, type Config, type Invitation } from '../../../../types';
  import Button from '$lib/Button.svelte';

  // Silly hack to get around issues with typescript in sveltekit-i18n
  const tAny = t as any

  $: conversationId = $page.params.id;
  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  const myPublicKey64 = relayStore.client.myPubKeyB64
  $: conversation = relayStore.getConversation(conversationId)

  // used for editing Group conversation details
  $: image = conversation ? conversation.data?.config.image : undefined
  $: title = conversation ? conversation.data?.config.title : undefined

  let editingTitle = false
  let titleElem: HTMLInputElement

  const createInviteCode = async (publicKeyB64: string) => {
    if (!conversation) return
    const proof = await relayStore.inviteAgentToConversation(conversationId, decodeHashFromBase64(publicKeyB64))
    if (proof !== undefined) {
      const invitation: Invitation = {
        created: conversation.created, // TODO: put in data
        conversationName: conversation.data?.config.title,
        progenitor: conversation.data.progenitor,
        privacy: conversation.data.privacy,
        proof,
        networkSeed: conversation.data.id
      }
      const msgpck = encode(invitation);
      const inviteCode = Base64.fromUint8Array(msgpck);
      copyToClipboard(inviteCode)
    }
    else {
      alert($t('conversations.unable_to_create_code'))
    }
  }

  const saveTitle = async () => {
    if (conversation && titleElem.value) {
      await updateConfig({ image: image || conversation?.data?.config.image, title: titleElem.value.trim() })
      title = titleElem.value
      editingTitle = false
    }
  }

  const cancelEditTitle = () => {
    editingTitle = false
    title = conversation?.data?.config.title
  }

  const updateConfig = async (config: Config) => {
    if (!conversation) return
    await conversation.updateConfig(config)
    image = config.image
    title = config.title
  }
</script>

<Header>
  <a class='absolute' href={`/conversations/${conversationId}`}><SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">{#if conversation.data.privacy === Privacy.Public}{$t('conversations.group_details')}{:else}{conversation.title}{/if}</h1>
    {#if conversation.data.privacy === Privacy.Private && encodeHashToBase64(conversation.data.progenitor) === relayStore.client.myPubKeyB64}
      <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
    {/if}
  {/if}
</Header>

{#if conversation}
  {@const numMembers = Object.values(conversation.data.agentProfiles).length}

  <div class="container mx-auto flex items-center flex-col flex-1 overflow-hidden w-full pt-10">
    {#if conversation.privacy === Privacy.Private}
      <div class='flex gap-4 items-center justify-center'>
        {#each conversation.allMembers.slice(0, 2) as contact, i}
          {#if contact}
            <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size={120} moreClasses='mb-5' />
          {/if}
        {/each}
        {#if conversation.allMembers.length > 2}
          <div class='w-10 h-10 min-h-10 mb-5 rounded-full variant-filled-tertiary flex items-center justify-center'>
            <span class='text-xl'>+{(conversation.allMembers.length - 2)}</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Hidden file input -->
      <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" class='hidden'
        on:change={(event) => handleFileChange(event,
          (imageData) => {
            updateConfig({ image: imageData, title: title || conversation.data?.config.title })
          }
        )}
      />
      {#if image}
        <div style="position:relative">
          <img src={image} alt='Group' class='w-32 h-32 min-h-32 mb-5 rounded-full object-cover' />
          <label for="avatarInput"
            class='rounded-full w-12 h-12 pl-1 bottom-5 right-0 bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-500 dark:hover:bg-secondary-400 absolute flex items-center justify-center cursor-pointer'
          >
            <SvgIcon icon='image' color={$modeCurrent ? '%232e2e2e' : 'white'} />
          </label>
        </div>
      {:else}
        <label for="avatarInput"
          class='rounded-full w-32 h-32 min-h-32 rounded-full bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-500 dark:hover:bg-secondary-400 flex items-center justify-center cursor-pointer'
        >
          <SvgIcon icon='image' size='44' color={$modeCurrent ? '%232e2e2e' : 'white'} />
        </label>
      {/if}
    {/if}
    {#if editingTitle}
      <div class="flex flex-row items-center justify-center">
        <input
          autofocus
          class='text-3xl text-center bg-surface-900 border-none outline-none focus:outline-none pl-0.5 pt-0 focus:ring-0'
          type='text'
          placeholder={$t('conversations.enter_name_here')}
          name='title'
          bind:this={titleElem}
          value={title}
          minlength={MIN_TITLE_LENGTH}
          on:keydown={(event) => {
            if (event.key === 'Enter') saveTitle();
            if (event.key === 'Escape') cancelEditTitle();
          }}
        />
          <Button
            moreClasses="h-6 w-6 rounded-md py-0 !px-0 mb-0 mr-2 bg-primary-100 flex items-center justify-center"
            onClick={() => saveTitle()}
          >
            <SvgIcon icon='checkMark' color='%23FD3524' size='12' />
          </Button>
          <Button
            moreClasses="h-6 w-6 !px-0 py-0 mb-0 rounded-md bg-surface-400 flex items-center justify-center"
            onClick={() => cancelEditTitle()}
          >
            <SvgIcon icon='x' color='gray' size='12' />
          </Button>
      </div>
    {:else}
      <div class="flex row">
        <h1 class='text-3xl flex-shrink-0 mb-1 mr-1 text-nowrap text-ellipsis overflow-hidden'>
          {title}
        </h1>
        {#if conversation.privacy !== Privacy.Private}
          <button on:click={() => editingTitle = true}>
            <SvgIcon icon='write' size='24' color='gray' moreClasses='cursor-pointer' />
          </button>
        {/if}
      </div>
    {/if}
    <p class='text-sm'>{$tAny('conversations.created', { date: conversation.created })}</p>
    <p class='text-sm'>{$tAny('conversations.num_members', { count: numMembers })}</p>

    <div class="container mx-auto flex flex-col px-4 overflow-y-auto">
      <ul class="flex-1 mt-10">
        {#if conversation.privacy === Privacy.Public}
          <li class='text-xl flex flex-row mb-2 items-center rounded-full variant-filled-primary p-2'>
            <span class='rounded-full bg-surface-500 w-10 h-10 inline-block flex items-center justify-center'>
              <SvgIcon icon='addPerson' size='24' color='%23FD3524'/>
            </span>
            <span class='ml-4 text-sm font-bold flex-1'>{$t('conversations.add_members')}</span>
            <button class='rounded-full bg-surface-500 text-secondary-500 font-bold text-xs py-2 px-2 mr-1 flex items-center justify-center' on:click={() => copyToClipboard(conversation.publicInviteCode)}>
              <SvgIcon icon='copy' size='14' color='%23FD3524' moreClasses='mr-2' />
              {$t('conversations.copy_invite')}
            </button>
          </li>
        {/if}
        {#if conversation.invitedUnjoined.length > 0}
          <h3 class='text-md mb-2 text-secondary-300 font-light'>{$t('conversations.unclaimed_invitations')}</h3>
          {#each conversation.invitedUnjoined as contact}
            <li class='text-xl flex flex-row mb-4 px-2 items-center'>
              <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size='38' moreClasses='-ml-30'/>
              <span class='ml-4 text-sm flex-1'>{contact.firstName + ' ' + contact.lastName}</span>
              <button class='rounded-2xl variant-filled-tertiary font-bold text-sm p-2 px-3 flex items-center justify-center' on:click={() => createInviteCode(contact.publicKeyB64)}>
                <SvgIcon icon='copy' size='18' color='%23FD3524' moreClasses='mr-2' />
                {$t('conversations.copy_invite')}
              </button>
            </li>
          {/each}
        {/if}

        {#if conversation.privacy === Privacy.Private}
          <h3 class='text-md mt-4 mb-2 text-secondary-300 font-light'>{$t('conversations.members')}</h3>
        {/if}
        <li class='text-xl flex flex-row mb-4 px-2 items-center'>
          <Avatar agentPubKey={myPublicKey64} size='38' moreClasses='-ml-30'/>
          <span class='ml-4 text-sm font-bold flex-1'>{$t('conversations.you')}</span>
          {#if myPublicKey64 === encodeHashToBase64(conversation.data.progenitor)}
            <span class='text-xs text-secondary-300 ml-2'>{$t('conversations.admin')}</span>
          {/if}
        </li>
        {#each conversation.memberList() as contact}
          <li class='text-xl flex flex-row mb-4 px-2 items-center'>
            <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size='38' moreClasses='-ml-30'/>
            <span class='ml-4 text-sm font-bold flex-1'>{contact.firstName + ' ' + contact.lastName}</span>
            {#if contact.publicKeyB64 === encodeHashToBase64(conversation.data.progenitor)}
              <span class='text-xs text-secondary-300 ml-2'>{$t('conversations.admin')}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}