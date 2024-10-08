<script lang="ts">
	import { debounce } from 'lodash-es';
  import { type AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { type Profile } from '@holochain-open-dev/profiles';
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { getContext, onDestroy, onMount } from 'svelte';
  import { type Unsubscriber, derived, writable, type Writable } from "svelte/store";
  import Time from "svelte-time";
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { t } from '$lib/translations';
  import { copyToClipboard, isMobile, linkify, sanitizeHTML, shareText } from '$lib/utils';
  import { RelayStore } from '$store/RelayStore';
  import { Privacy, type Conversation, type Message, type Image } from '../../../types';

  // Silly hack to get around issues with typescript in sveltekit-i18n
  const tAny = t as any;

  $: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  let myPubKeyB64 = relayStore.client.myPubKeyB64

  $: conversation = relayStore.getConversation(conversationId);
  $: contacts = relayStore.contacts

  let agentProfiles: { [key: AgentPubKeyB64]: Profile } = {};
  let numMembers = 0;
  let unsubscribe : Unsubscriber;

  let configTimeout : NodeJS.Timeout
  let agentTimeout : NodeJS.Timeout
  let messageTimeout : NodeJS.Timeout

  let newMessageInput : HTMLInputElement;
  let newMessageText = '';
  const newMessageImages : Writable<Image[]> = writable([]);
  let conversationContainer: HTMLElement;
  let scrollAtBottom = true;
  let scrollAtTop = false;
  const SCROLL_BOTTOM_THRESHOLD = 100; // How close to the bottom must the user be to consider it "at the bottom"
  const SCROLL_TOP_THRESHOLD = 300; // How close to the top must the user be to consider it "at the top"

  const checkForAgents = () => {
    conversation && conversation.fetchAgents().then((agentProfiles) => {
      if (Object.values(agentProfiles).length < 2) {
        agentTimeout = setTimeout(() => {
          checkForAgents()
        }, 2000)
      }
    })
  }

  const checkForConfig = () => {
    conversation && conversation.getConfig().then((config) => {
      if (!config?.title) {
        configTimeout = setTimeout(() => {
          checkForConfig()
        }, 2000)
      }
    })
  }

  const checkForMessages = () => {
    conversation && conversation.loadMessageSetFrom(conversation.currentBucket()).then(([_,hashes]) => {
      // If this we aren't getting anything back and there are no messages loaded at all
      // then keep trying as this is probably a no network, or a just joined situation
      if (hashes.length == 0  && Object.keys(conversation.data.messages).length == 0) {
        messageTimeout = setTimeout(() => {
          checkForMessages()
        }, 2000)
      }
    })
  }

  function handleResize() {
    if (scrollAtBottom) {
      scrollToBottom();
    }
  }
  const debouncedHandleResize = debounce(handleResize, 100);

  onMount(() => {
    if (!conversation) {
      goto('/conversations');
    } else {
      unsubscribe = conversation.subscribe((c: Conversation) => {
        agentProfiles = c.agentProfiles
        // messages = c.messages;
        numMembers = Object.values(agentProfiles).length;
      });
      // TODO: do this check in one call of checkForStuff
      checkForAgents()
      checkForConfig()
      checkForMessages()
      conversationContainer.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', debouncedHandleResize);
      newMessageInput.focus();
      conversation.setOpen(true)
      conversation.setUnread(false)
    }
  });

  // Cleanup
  onDestroy(() => {
    if (conversation) {
      conversation.setOpen(false)
    }
    unsubscribe && unsubscribe();
    clearTimeout(agentTimeout);
    clearTimeout(configTimeout);
    clearTimeout(messageTimeout);
    conversationContainer && conversationContainer.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', debouncedHandleResize);
  });

  // Derived store to process messages and add headers
  $: processedMessages = conversation && derived(conversation, ($value) => {
    const messages = Object.values(($value as Conversation).messages).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const result: Message[] = [];

    let lastMessage: Message | null = null;

    messages.forEach(message => {
      // Don't display message if we don't have a profile from the author yet.
      // TODO: could wait until all profiles have been synced first?
      if (!agentProfiles[message.authorKey]) {
        return;
      }

      const contact = $contacts.find(c => c.publicKeyB64 === message.authorKey)

      const displayMessage = {
        ...message,
        author: contact?.firstName || ($value as Conversation).agentProfiles[message.authorKey].fields.firstName,
        avatar: contact?.avatar || ($value as Conversation).agentProfiles[message.authorKey].fields.avatar
      }

      if (!lastMessage || message.timestamp.toDateString() !== lastMessage.timestamp.toDateString()) {
        displayMessage.header = message.timestamp.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }

      // If same person is posting a bunch of messages in a row, hide their name and avatar
      if (lastMessage?.authorKey === message.authorKey && message.timestamp.getTime() - lastMessage.timestamp.getTime() < 1000 * 60 * 5) {
        displayMessage.hideDetails = true
      }

      result.push(displayMessage);
      lastMessage = message;
    })

    return result
  })

  // Reactive update to scroll to the bottom every time the messages update,
  // but only if the user is near the bottom already
  $: if ($processedMessages && $processedMessages.length > 0) {
    if (scrollAtBottom) {
      setTimeout(scrollToBottom, 100);
    }
  }

  const handleScroll = debounce(() => {
    const atTop = conversationContainer.scrollTop < SCROLL_TOP_THRESHOLD
    if (!scrollAtTop && atTop && conversation) {
      conversation.loadMessagesSet()
    }
    scrollAtTop = atTop
    scrollAtBottom = conversationContainer.scrollHeight - conversationContainer.scrollTop <= conversationContainer.clientHeight + SCROLL_BOTTOM_THRESHOLD;
  }, 100)

  function scrollToBottom() {
    if (conversationContainer) {
      conversationContainer.scrollTop = conversationContainer.scrollHeight;
      scrollAtBottom = true
    }
  }

  async function sendMessage(e: SubmitEvent) {
    if (conversation && (newMessageText.trim() || $newMessageImages.length > 0)) {
      conversation.sendMessage(myPubKeyB64, newMessageText, $newMessageImages)
      newMessageText = ''; // Clear input after sending
      newMessageImages.set([])
      setTimeout(scrollToBottom, 100)
      newMessageInput.focus();
    }
    e.preventDefault();
  }

  async function handleImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const readers : Promise<Image>[] = files.map(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        return new Promise<Image>((resolve) => {
          reader.onload = async () => {
            if (typeof reader.result === 'string') {
              resolve({
                dataURL: reader.result,
                lastModified: file.lastModified,
                fileType: file.type,
                file,
                name: file.name,
                size: file.size,
                status: 'pending'
              })
            }
          };
          reader.onerror = () => {
            console.error('Error reading file');
            resolve({
              dataURL: '',
              lastModified: file.lastModified,
              fileType: file.type,
              file,
              name: file.name,
              size: file.size,
              status: 'error'
            })
          }
        })
      })

      // When all files are read, update the images store
      Promise.all(readers).then((newImages: Image[]) => {
        newMessageImages.update(currentImages => ([...currentImages, ...newImages]));
      })
    }
  }
</script>

<Header>
  <a class='pr-5' href={`/conversations${conversation?.archived ? '/archive' : ''}`}><SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">
      <a href={`/conversations/${conversationId}/details`} class='pl-5 flex flex-row items-center justify-center'>
        {conversation.title}
        <button class='ml-2' on:click={() => goto(`/conversations/${conversationId}/details`)}>
          <SvgIcon icon='gear' size='18' color={$modeCurrent ? '%232e2e2e' : 'white'} />
        </button>
      </a>
    </h1>
    {#if conversation.data.privacy === Privacy.Public || encodeHashToBase64(conversation.data.progenitor) === myPubKeyB64}
      <a class='pl-5' href={`/conversations/${conversation.data.id}/${conversation.data.privacy === Privacy.Public ? 'details' : 'invite'}`}>
        <SvgIcon icon='addPerson' size='24' color={$modeCurrent ? '%232e2e2e' : 'white'} />
      </a>
    {:else}
      <span class='pl-8'>&nbsp;</span>
    {/if}
  {/if}
</Header>

{#if conversation && typeof $processedMessages !== 'undefined'}
  <div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden w-full">
    <div class='overflow-y-auto flex flex-col grow items-center w-full pt-10' bind:this={conversationContainer} id='message-container'>
      {#if conversation.privacy === Privacy.Private}
        <div class='flex gap-4 items-center justify-center'>
          {#if encodeHashToBase64(conversation.data.progenitor) !== myPubKeyB64 && numMembers === 1}
            <!-- When you join a private conversation and it has not synced yet -->
            <SvgIcon icon='spinner' size='44' color={$modeCurrent ? '%232e2e2e' : 'white'} moreClasses='mb-5' />
          {/if}
          {#each conversation.allMembers.slice(0, 2) as contact, i}
            {#if contact}
              <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size={120} moreClasses='mb-5' />
            {/if}
          {/each}
          {#if conversation.allMembers.length > 2}
            <div class='w-10 h-10 min-h-10 mb-5 variant-filled-tertiary rounded-full flex items-center justify-center'>
              <span class='text-xl'>+{(conversation.allMembers.length - 2)}</span>
            </div>
          {/if}
        </div>
      {:else if conversation.data?.config.image}
        <img src={conversation.data?.config.image} alt='Conversation' class='w-32 h-32 min-h-32 mb-5 rounded-full object-cover' />
      {/if}
      <h1 class='text-3xl flex-shrink-0 mb-1 text-nowrap text-ellipsis overflow-hidden'>{conversation.title}</h1>
      <!-- if joining a conversation created by someone else, say still syncing here until there are at least 2 members -->
      <a href={`/conversations/${conversationId}/details`} class='text-sm'>
        {$tAny('conversations.num_members', { count: numMembers })}
      </a>
      {#if $processedMessages.length === 0 && encodeHashToBase64(conversation.data.progenitor) === myPubKeyB64 && numMembers === 1}
        <!-- No messages yet, no one has joined, and this is a conversation I created. Display a helpful message to invite others -->
        <div class='flex flex-col items-center justify-center h-full w-full'>
          <img src={$modeCurrent ? '/clear-skies-gray.png' : '/clear-skies-white.png'} alt='No contacts' class='w-32 h-32 mb-4 mt-4' />
          {#if conversation.data.privacy === Privacy.Private}
            {#if conversation.allMembers.length === 1}
              <!-- A 1:1 conversation, so this is a pending connection -->
              <div class='flex flex-col items-center bg-tertiary-500 dark:bg-secondary-500 rounded-xl p-4 mx-8 mb-3'>
                <SvgIcon icon='handshake' size='36' color={$modeCurrent ? '%23232323' : 'white'} />
                <h1 class='text-secondary-500 dark:text-tertiary-100 text-xl font-bold mt-2'>{$t('contacts.pending_connection_header')}</h1>
                <p class='text-sm text-center text-secondary-400 dark:text-tertiary-700 mt-4 mb-6'>{$tAny('contacts.pending_connection_description', { name: conversation.title })}</p>
                <div class='flex justify-center'>
                  <Button moreClasses='bg-surface-100 text-sm text-secondary-500 dark:text-tertiary-100 font-bold dark:bg-secondary-900' onClick={() => { copyToClipboard(conversation.inviteCodeForAgent(conversation.allMembers[0]?.publicKeyB64))}}>
                    <SvgIcon icon='copy' size='20' color='%23FD3524' moreClasses='mr-2' />
                    {$t('contacts.copy_invite_code')}
                  </Button>
                  {#if isMobile()}
                    <Button moreClasses='bg-surface-100 text-sm text-secondary-500 dark:text-tertiary-100 font-bold dark:bg-secondary-900' onClick={() => { shareText(conversation.inviteCodeForAgent(conversation.allMembers[0]?.publicKeyB64))}}>
                      <SvgIcon icon='share' size='20' color='%23FD3524' moreClasses='mr-2' />
                      {$t('contacts.share_invite_code')}
                    </Button>
                  {/if}
                </div>
              </div>
            {:else}
              <p class='text-xs text-center text-secondary-500 dark:text-tertiary-500 mx-10 mb-8'>{$t('conversations.share_personal_invitations')}</p>
              <Button onClick={() => goto(`/conversations/${conversation.data.id}/details`)} moreClasses='w-72 justify-center'>
                <SvgIcon icon='ticket' size='24' color={$modeCurrent ? 'white' : '%23FD3524'} />
                <strong class='ml-2'>{$t('conversations.send_invitations')}</strong>
              </Button>
            {/if}
          {:else}
            <!-- Public conversation, make it easy to copy invite code-->
            <p class='text-xs text-center text-secondary-500 dark:text-tertiary-700 mx-10 mb-8'>{$t('conversations.share_invitation_code_msg')}</p>
            <Button onClick={() => copyToClipboard(conversation.publicInviteCode)} moreClasses='w-64 justify-center variant-filled-tertiary'>
              <SvgIcon icon='copy' size='18' color='%23FD3524' />
              <strong class='ml-2 text-sm'>{$t('conversations.copy_invite_code')}</strong>
            </Button>
            {#if isMobile()}
            <Button onClick={() => shareText(conversation.publicInviteCode)} moreClasses='w-64 justify-center variant-filled-tertiary'>
              <SvgIcon icon='share' size='18' color='%23FD3524' />
                <strong class='ml-2 text-sm'>{$t('conversations.share_invite_code')}</strong>
            </Button>
            {/if}

          {/if}
        </div>
      {:else}
        <div id='message-box' class="flex-1 p-4 flex flex-col-reverse w-full">
          <ul>
            {#each $processedMessages as message (message.hash)}
              {@const fromMe = message.authorKey === myPubKeyB64}
              {#if message.header}
                <li class='mt-auto mb-3'>
                  <div class="text-center text-xs text-secondary-400 dark:text-secondary-300">{message.header}</div>
                </li>
              {/if}
              <li class='mt-auto {!message.hideDetails && 'mt-3'} flex {fromMe ? 'justify-end' : 'justify-start'}'>
                {#if !fromMe}
                  {#if !message.hideDetails}
                    <Avatar image={message.avatar} agentPubKey={message.authorKey} size='24' moreClasses='items-start mt-1'/>
                  {:else}
                    <span class='min-w-6 inline-block'></span>
                  {/if}
                {/if}
                <div class='ml-3 w-2/3 {fromMe && 'items-end text-end'}'>
                  {#if !message.hideDetails}
                    <span class='flex items-baseline {fromMe && 'flex-row-reverse opacity-80'}'>
                      <span class="font-bold">{fromMe ? "You" : message.author}</span>
                      <span class="mx-2 text-xxs"><Time timestamp={message.timestamp} format="h:mma" /></span>
                    </span>
                  {/if}
                  {#if message.images && message.images.length > 0}
                      {#each message.images as image (image.name + image.lastModified)}
                        {#if image && image.status === 'loaded' || image.status === 'pending'}
                          <!-- svelte-ignore a11y-missing-attribute -->
                          <div class='relative inline {fromMe && 'text-end'}'>
                            <img src={image.dataURL} class='inline max-w-2/3 object-cover mb-2' />
                            {#if image.status === 'pending'}
                              <SvgIcon icon='spinner' color='white' size='10' moreClasses='absolute top-1/2 left-1/2 -mt-1' />
                            {/if}
                          </div>
                        {:else}
                          <div class='w-20 h-20 bg-tertiary-500 mb-2 flex items-center justify-center'>
                            <SvgIcon icon='spinner' color='white' size='10' />
                          </div>
                        {/if}
                      {/each}
                  {/if}
                  <div class="message font-light break-words w-full {fromMe && 'text-end'}">
                    {@html sanitizeHTML(linkify(message.content))}
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
  <div class="w-full p-2 bg-tertiary-500 dark:bg-secondary-500 flex-shrink-0">
    <form class="flex" method='POST' on:submit={sendMessage} >
      <input type="file" accept="image/jpeg, image/png, image/gif" multiple id="images" class='hidden' on:change={handleImagesSelected} />
      <label for="images" class='cursor-pointer flex'>
        <SvgIcon icon='image' color={$modeCurrent ? '%232e2e2e' : 'white'} size='26' moreClasses='ml-3' />
      </label>
      <div class='flex flex-col w-full'>
        <!-- svelte-ignore a11y-autofocus -->
        <input
          autofocus
          type="text"
          bind:this={newMessageInput}
          bind:value={newMessageText}
          class="w-full bg-tertiary-500 placeholder:text-sm placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0"
          placeholder={$t('conversations.message_placeholder')}
        />
        <div class='flex flex-row px-4'>
          {#each $newMessageImages as image, i}
            {#if image.status === 'loading'}
              <div class='w-10 h-10 bg-tertiary-500 mr-2 flex items-center justify-center'>
                <SvgIcon icon='spinner' color='white' size='10' />
              </div>
            {:else}
              <!-- svelte-ignore a11y-missing-attribute -->
              <img src={image.dataURL} class='w-10 h-10 object-cover mr-2' />
            {/if}
          {/each}
        </div>
      </div>
      <button disabled={newMessageText.trim() === '' && $newMessageImages.length === 0} class='pr-2 disabled:opacity-50'>
        <SvgIcon icon='caretRight' color={$modeCurrent ? '#2e2e2e' : 'white'} size='10' />
      </button>
    </form>
  </div>
{/if}

<style type='text/css'>
  .message :global(a) {
    color: rgba(var(--color-primary-500));
  }
</style>