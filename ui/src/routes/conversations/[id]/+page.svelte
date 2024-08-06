<script lang="ts">
	import { debounce } from 'lodash-es';
  import { type AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { type Profile } from '@holochain-open-dev/profiles';
  import { getContext, onDestroy, onMount } from 'svelte';
  import { type Unsubscriber, derived, writable, type Writable } from "svelte/store";
  import Time from "svelte-time";
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import { copyToClipboard } from '$lib/utils';
  import { Privacy, type Conversation, type Message, type Image } from '../../../types';

  $: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  let myPubKey = relayStore.client.myPubKey
  let myPubKeyB64 = relayStore.client.myPubKeyB64

  $: conversation = relayStore.getConversation(conversationId);
  $: messageCount = conversation ? conversation.history.messageCount : undefined

  //let messages: { [key: string]: Message } = {};
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
      conversation.setStatus('opened')
    }
  });

  onDestroy(()=>{
    if (conversation) {
      conversation.setStatus('closed')
    }
  })

  // Cleanup the subscription
  onDestroy(() => {
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

    let lastDate: Date | null = null;

    messages.forEach(message => {
      // Don't display message if we don't have a profile from the author yet.
      // TODO: could wait until all profiles have been synced first?
      if (!agentProfiles[message.authorKey]) {
        return;
      }

      message.author = ($value as Conversation).agentProfiles[message.authorKey].fields.firstName;
      message.avatar = ($value as Conversation).agentProfiles[message.authorKey].fields.avatar;

      const formattedDate: string = message.timestamp.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      });

      if (!lastDate || message.timestamp.toDateString() !== lastDate.toDateString()) {
        result.push({ ...message, header: formattedDate });
        lastDate = message.timestamp;
      } else {
        result.push({ ...message });
      }
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
    if (conversation && newMessageText.trim()) {
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
  <a class='absolute' href="/conversations"><SvgIcon icon='caretLeft' color='white' size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center"><a href={`/conversations/${conversationId}/details`}>{@html conversation.title}</a></h1>
    {#if conversation.data.privacy === Privacy.Public || encodeHashToBase64(conversation.data.progenitor) === myPubKeyB64}
      <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
    {/if}
  {/if}
</Header>

{#if conversation && typeof $processedMessages !== 'undefined'}
  <div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden w-full">
    <div class='overflow-y-auto flex flex-col grow items-center w-full pt-10' bind:this={conversationContainer} id='message-container'>
      {#if conversation.privacy === Privacy.Private}
        <div class='flex gap-4 items-center justify-center'>
          {#each conversation.allMembers.slice(0, 2) as contact, i}
            {#if contact}
              <Avatar image={contact.avatar} agentPubKey={contact.publicKeyB64} size={120} moreClasses='mb-5' />
            {/if}
          {/each}
          {#if conversation.allMembers.length > 2}
            <div class='w-10 h-10 min-h-10 mb-5 rounded-full bg-surface-400 flex items-center justify-center'>
              <span class='text-primary-400 text-xl'>+{(conversation.allMembers.length - 2)}</span>
            </div>
          {/if}
        </div>
      {:else if conversation.data?.config.image}
        <img src={conversation.data?.config.image} alt='Conversation' class='w-32 h-32 min-h-32 mb-5 rounded-full object-cover' />
      {/if}
      <h1 class='text-3xl flex-shrink-0 mb-1 text-nowrap text-ellipsis overflow-hidden'>{@html conversation.title}</h1>
      <!-- if joining a conversation created by someone else, say still syncing here until thre are at least 2 members -->
      <a href={`/conversations/${conversationId}/details`} class='text-surface-300 text-sm'>
        {@html numMembers } {#if numMembers === 1}Member{:else}Members{/if}
      </a>
      {#if $processedMessages.length === 0 && encodeHashToBase64(conversation.data.progenitor) === myPubKeyB64}
        <div class='flex flex-col items-center justify-center h-full w-full'>
          <img src='/clear-skies.png' alt='No contacts' class='w-32 h-32 mb-4 mt-4' />
          {#if conversation.data.privacy === Privacy.Private}
            <p class='text-xs text-center text-secondary-500 mx-10 mb-8'>Nobody else is here yet! Share personal invitations to start the conversation.</p>
            <Button onClick={() => goto(`/conversations/${conversation.data.id}/details`)} moreClasses='w-72 justify-center'>
              <SvgIcon icon='invite' size='24' color='red' />
              <strong class='ml-2'>Send invitations</strong>
            </Button>
          {:else}
            <p class='text-xs text-center text-secondary-500 mx-10 mb-8'>Nobody else is here! Share your invitation code to start the conversation.</p>
            <Button onClick={() => copyToClipboard(conversation.publicInviteCode)} moreClasses='w-64 justify-center'>
              <SvgIcon icon='copy' size='18' color='red' />
              <strong class='ml-2 text-sm'>Copy invitation code</strong>
            </Button>
          {/if}
        </div>
      {:else}
        <div id='message-box' class="flex-1 p-4 flex flex-col-reverse w-full">
          <ul>
            {#each $processedMessages as message (message.hash)}
              {@const fromMe = message.authorKey === myPubKeyB64}
              {#if message.header}
                <li class='mt-auto mb-3'>
                  <div class="text-center text-xs text-secondary-500">{message.header}</div>
                </li>
              {/if}
              <li class='mt-auto mb-3 flex {fromMe ? 'justify-end' : 'justify-start'}'>
                {#if !fromMe}
                  <Avatar agentPubKey={message.authorKey} size='24' moreClasses='items-start mt-1'/>
                {/if}
                <div class='mb-2 ml-3 {fromMe && 'items-end text-end'}'>
                  <span class='flex items-baseline {fromMe && 'flex-row-reverse opacity-80'}'>
                    <span class="font-bold">{@html fromMe ? "You" : message.author}</span>
                    <span class="text-surface-200 mx-2 text-xxs"><Time timestamp={message.timestamp} format="h:mma" /></span>
                  </span>
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
                          <div class='w-20 h-20 bg-surface-400 mb-2 flex items-center justify-center'>
                            <SvgIcon icon='spinner' color='white' size='10' />
                          </div>
                        {/if}
                      {/each}
                  {/if}
                  <div class="font-light {fromMe && 'text-end'}">{@html message.content}</div>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
  <div class="w-full p-2 bg-surface-500 flex-shrink-0">
    <form class="flex" method='POST' on:submit={sendMessage} >
      <input type="file" accept="image/jpeg, image/png, image/gif" multiple id="images" class='hidden' on:change={handleImagesSelected} />
      <label for="images" class='cursor-pointer flex'>
        <SvgIcon icon='image' color='white' size='26' moreClasses='ml-3' />
      </label>
      <div class='flex flex-col w-full'>
        <!-- svelte-ignore a11y-autofocus -->
        <input type="text" bind:this={newMessageInput} bind:value={newMessageText} autofocus class="w-full bg-surface-500 placeholder:text-sm placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Type a message...">
        <div class='flex flex-row px-4'>
          {#each $newMessageImages as image, i}
            {#if image.status === 'loading'}
              <div class='w-10 h-10 bg-surface-400 mr-2 flex items-center justify-center'>
                <SvgIcon icon='spinner' color='white' size='10' />
              </div>
            {:else}
              <!-- svelte-ignore a11y-missing-attribute -->
              <img src={image.dataURL} class='w-10 h-10 object-cover mr-2' />
            {/if}
          {/each}
        </div>
      </div>
      <button class='pr-2'><SvgIcon icon='caretRight' color='white' size='10' /></button>
    </form>
  </div>
{/if}