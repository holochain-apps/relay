<script lang="ts">
  import { Base64 } from 'js-base64';
  import { encode } from '@msgpack/msgpack';
  import { getContext } from 'svelte';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { page } from '$app/stores';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { copyToClipboard, handleFileChange, MIN_TITLE_LENGTH } from '$lib/utils';
  import type { RelayStore } from '$store/RelayStore';
  import { Privacy, type Config, type Invitation } from '../../../../types';
  import Button from '$lib/Button.svelte';

  $: conversationId = $page.params.id;
  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  const myPublicKey64 = relayStore.client.myPubKeyB64
  $: conversation = relayStore.getConversation(conversationId)

  // used for when this is a Group conversation
  $: image = conversation ? conversation.config.image : undefined
  $: title = conversation ? conversation.title : undefined

  let editTitle = false
  let titleElem:HTMLInputElement
  const createInviteCode = async (publicKeyB64: string) => {

    if (!conversation) return
    const proof = await relayStore.inviteAgentToConversation(conversationId, decodeHashFromBase64(publicKeyB64))
    if (proof !== undefined) {
      const invitation: Invitation = {
        conversationName: conversation.data.config.title,
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
      alert("Unable to create invitation code")
    }
  }

  const updateConfig = async (config:Config) => {
    if (!conversation) return
    await conversation.updateConfig(config)
    image = config.image
    title = config.title
  }
</script>

<Header>
  <a class='absolute' href={`/conversations/${conversationId}`}><SvgIcon icon='caretLeft' color='white' size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">{#if conversation.data.privacy === Privacy.Public}Group Details{:else}{@html conversation.title}{/if}</h1>
    {#if conversation.data.privacy === Privacy.Public || encodeHashToBase64(conversation.data.progenitor) === relayStore.client.myPubKeyB64}
      <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
    {/if}
  {/if}
</Header>

{#if conversation}
  {@const numMembers = Object.values(conversation.data.agentProfiles).length}

  <div class="container mx-auto flex items-center flex-col flex-1 overflow-hidden w-full pt-10">
    {#if conversation.privacy === Privacy.Private}
      <div class='flex gap-4 items-center justify-center'>
        {#each conversation.invitedContacts.slice(0, 2) as contact, i}
          {#if contact}
            <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size={120} moreClasses='mb-5' />
          {/if}
        {/each}
        {#if conversation.invitedContacts.length > 2}
          <div class='w-10 h-10 min-h-10 mb-5 rounded-full bg-surface-400 flex items-center justify-center'>
            <span class='text-primary-400 text-xl'>+{(conversation.invitedContacts.length - 2)}</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Hidden file input -->
      <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" capture class='hidden'
        on:change={(event)=>handleFileChange(event,
          (imageData) => {
            updateConfig({image:imageData, title: conversation.config.title})
          }
        )} />
      {#if image}
        <div style="position:relative">
          <img src={image} alt='Group' class='w-32 h-32 min-h-32 mb-5 rounded-full object-cover' />
          <label for="avatarInput"
            class='rounded-full w-12 h-12 absolute flex items-center justify-center' style="padding-left:5px; bottom:5px;right:5px;background:black;">
            <img src='/image-placeholder.png' alt='Group Image Uploader' />
          </label>
        </div>
      {:else}
        <label for="avatarInput"
            class='rounded-full w-32 h-32 rounded-full bg-surface-400 flex items-center justify-center'>
          <img src='/image-placeholder.png' alt='Group Image Uploader' />
        </label>
      {/if}
    {/if}
    {#if editTitle}
      <div class="flex flex-col items-center justify-center"> 
        <input
          autofocus
          class='text-3xl text-center mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
          type='text'
          placeholder='Enter name here'
          name='title'
          bind:this={titleElem}
          value={title}
          minlength={MIN_TITLE_LENGTH}
        />
        <div class="flex flex-col"> 
          <Button moreClasses="h-6"
            onClick={async ()=>{
              if (titleElem.value) {
                await updateConfig({image:conversation.config.image, title: titleElem.value})
                title = titleElem.value
                editTitle = false
              }
            }}
              >Save</Button>
          <Button moreClasses="h-6"
              onClick={()=>editTitle=false}
            >Cancel</Button>
        </div>
      </div>
    {:else}
      <div class="flex row"> 
        <h1 class='text-3xl flex-shrink-0 mb-1'>
          {title}
        </h1>
        {#if conversation.privacy !== Privacy.Private}
          <span 
            on:click={()=>editTitle=true}
          > <SvgIcon icon='write' size='24' color='gray' /></span>
        {/if}
      </div>
    {/if}
    <p class='text-sm text-surface-300'>{@html numMembers } {#if numMembers === 1}Member{:else}Members{/if}</p>

    <div class="container mx-auto flex flex-col px-4">
      <ul class="flex-1 mt-10">
        {#if conversation.privacy === Privacy.Public}
          <li class='text-xl flex flex-row mb-4 items-center'>
            <span class='rounded-full bg-primary-100 w-10 h-10 inline-block flex items-center justify-center'><SvgIcon icon='addPerson' size='24' color='red'/></span>
            <span class='ml-4 text-md flex-1'>Add Members</span>
            <button class='rounded-lg bg-primary-100 text-surface-800 font-bold text-sm p-2 flex items-center justify-center' on:click={() => copyToClipboard(conversation.publicInviteCode)}>
              <SvgIcon icon='copy' size='18' color='red' moreClasses='mr-2' />
              Copy Invite
            </button>
          </li>
        {/if}
        {#if conversation.invitedList.length > 0}
          <h3 class='text-lg mb-2 text-surface-200 font-light'>Invited</h3>
          {#each conversation.invitedList as contact}
            <li class='text-xl flex flex-row mb-4 items-center'>
              <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size='38' moreClasses='-ml-30'/>
              <span class='ml-4 text-md flex-1'>{contact.firstName + ' ' + contact.lastName}</span>
              <button class='rounded-lg bg-primary-100 text-surface-800 font-bold text-sm p-2 flex items-center justify-center' on:click={() => createInviteCode(contact.publicKeyB64)}>
                <SvgIcon icon='copy' size='18' color='red' moreClasses='mr-2' />
                Copy Invite
              </button>
            </li>
          {/each}
        {/if}

        <h3 class='text-lg mt-4 mb-2 text-surface-200 font-light'>Members</h3>
        <li class='text-xl flex flex-row mb-4 items-center'>
          <Avatar agentPubKey={myPublicKey64} size='38' moreClasses='-ml-30'/>
          <span class='ml-4 text-md'>You</span>
        </li>
        {#each conversation.memberList as contact}
          <li class='text-xl flex flex-row mb-4 items-center'>
            <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size='38' moreClasses='-ml-30'/>
            <span class='ml-4 text-md'>{#if contact.publicKeyB64 === myPublicKey64}You{:else}{contact.firstName + ' ' + contact.lastName}{/if}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}