<script lang="ts">
	import { getContext } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import { handleFileChange, MIN_TITLE_LENGTH } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';
  import { Privacy } from '../../../types';

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  let title = ''
  let imageUrl = writable('')
  let pendingCreate = false

  async function createConversation(e: Event, privacy: Privacy) {
    pendingCreate = true;
    e.preventDefault();
    const conversation = await relayStore.createConversation(title, get(imageUrl), privacy);
    if (conversation) {
      goto(`/conversations/${conversation.data.id}`)
    }
  }

  $: valid = title.trim().length >= MIN_TITLE_LENGTH
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">{$t('common.new_group')}</h1>
</Header>

<div class='flex justify-center items-center flex-col my-10'>
  <!-- Hidden file input -->
  <input type="file" id="avatarInput" accept="image/jpeg, image/png, image/gif" class='hidden' on:change={(event)=>handleFileChange(event,(imageData)=>imageUrl.set(imageData))} />

  <!-- Label styled as a big clickable icon -->
  <label for="avatarInput" class="file-icon-label cursor-pointer bg-surface-400 hover:bg-surface-300 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden">
    {#if $imageUrl}
      <img src={$imageUrl} alt='Avatar' class='rounded-full w-32 h-32 object-cover' />
    {:else}
      <img src='/image-placeholder.png' alt='Conversation Uploader' class='rounded-full w-16 h-16' />
    {/if}
  </label>
</div>

<div class='flex flex-col justify-start grow'>
  <h1 class='h1'>{$t('conversations.group_name')}</h1>
  <input
    autofocus
    class='mt-2 bg-surface-900 border-none outline-none focus:outline-none pl-0.5 focus:ring-0'
    type='text'
    placeholder={$t('conversations.enter_name_here')}
    name='title'
    bind:value={title}
    minlength={MIN_TITLE_LENGTH}
  />
</div>

<footer>
  <Button moreClasses='w-72 justify-center' onClick={(e) => { createConversation(e, Privacy.Public)}} disabled={!valid || pendingCreate}>
    <strong class='ml-2'>{$t('conversations.create_group')}</strong>
  </Button>
</footer>