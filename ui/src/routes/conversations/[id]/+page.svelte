<script lang="ts">
	import { debounce, isEqual } from 'lodash-es';
  import { ProfilesStore, type Profile } from '@holochain-open-dev/profiles';
  import { type AgentPubKeyB64, decodeHashFromBase64 } from '@holochain/client';
  import { getContext, onDestroy, onMount } from 'svelte';
  import { get, type Unsubscriber, derived } from "svelte/store";
  import Time from "svelte-time";
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Button from "$lib/Button.svelte";
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import { copyToClipboard } from '$lib/utils';
  import { Privacy, type Conversation, type Message } from '../../../types';

  $: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  let myPubKey = relayStore.client.myPubKey
  let myPubKeyB64 = relayStore.client.myPubKeyB64

  $: conversation = relayStore.getConversation(conversationId);
  //let messages: { [key: string]: Message } = {};
  let agentProfiles: { [key: AgentPubKeyB64]: Profile } = {};
  let numMembers = 0;
  let unsubscribe : Unsubscriber;

  let configTimeout : NodeJS.Timeout
  let agentTimeout : NodeJS.Timeout
  let messageTimeout : NodeJS.Timeout

  let newMessageInput : HTMLInputElement;
  let newMessageText = '';
  let conversationContainer: HTMLElement;
  let scrollAtBottom = true;
  const SCROLL_THRESHOLD = 100; // How close to the bottom must the user be to consider it "at the bottom"

  const checkForAgents = () => {
    conversation && conversation.getAgents().then((agentProfiles) => {
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
    conversation && conversation.getMessages().then((messages) => {
      if (Object.values(messages).length === 0) {
        messageTimeout = setTimeout(() => {
          checkForMessages()
        }, 2000)
      }
    })
  }

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
      newMessageInput.focus();
    }
  });

  // Cleanup the subscription
  onDestroy(() => {
    unsubscribe && unsubscribe();
    clearTimeout(agentTimeout);
    clearTimeout(configTimeout);
    clearTimeout(messageTimeout);
    conversationContainer.removeEventListener('scroll', handleScroll);
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

      message.author = ($value as Conversation).agentProfiles[message.authorKey].nickname;
      message.avatar = ($value as Conversation).agentProfiles[message.authorKey].fields.avatar;

      const messageDate: Date = new Date(message.timestamp);
      const formattedDate: string = messageDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      });

      if (!lastDate || messageDate.toDateString() !== lastDate.toDateString()) {
        result.push({ ...message, header: formattedDate });
        lastDate = messageDate;
      } else {
        result.push({ ...message });
      }
    });

    return result;
  })

  // Reactive update to scroll to the bottom every time the messages update,
  // but only if the user is near the bottom already
  $: if ($processedMessages && $processedMessages.length > 0) {
    if (scrollAtBottom) {
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleScroll = debounce(() => {
    scrollAtBottom = conversationContainer.scrollHeight - conversationContainer.scrollTop <= conversationContainer.clientHeight + SCROLL_THRESHOLD;
  }, 100)

  function scrollToBottom() {
    if (conversationContainer) {
      conversationContainer.scrollTop = conversationContainer.scrollHeight;
      scrollAtBottom = true
    }
  }

  async function sendMessage(e: SubmitEvent) {
    if (conversation && newMessageText.trim()) {
      await conversation.sendMessage(myPubKeyB64, newMessageText);
      newMessageText = ''; // Clear input after sending
      setTimeout(scrollToBottom, 100)
      newMessageInput.focus();
    }
    e.preventDefault();
  }
</script>

<Header>
  <a class='absolute' href="/conversations"><SvgIcon icon='caretLeft' color='white' size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">{@html conversation.data.config.title}</h1>
    <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
  {/if}
</Header>

{#if conversation && typeof $processedMessages !== 'undefined'}
  <div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden w-full">
    <div class='overflow-y-auto flex flex-col grow items-center w-full pt-10' bind:this={conversationContainer} id='message-container'>
      {#if conversation.data.config.image}
        <img src={conversation.data.config.image} alt='Conversation' class='w-32 h-32 mb-5 rounded-full object-cover' />
      {/if}
      <h1 class='text-4xl flex-shrink-0'>{@html conversation.data.config.title}</h1>
      <!-- if joining a conversation created by someone else, say still syncing here until thre are at least 2 members -->
      <p  on:click={()=>goto(`/conversations/${conversationId}/users`)} 
        class='text-surface-300'>{@html numMembers } {#if numMembers === 1}Member{:else}Members{/if}</p>
      {#if $processedMessages.length === 0 && isEqual(conversation.data.progenitor, myPubKey)}
        <div class='flex flex-col items-center justify-center h-full w-full'>
          <p class='mb-8 text-secondary-400'>Invite people to start the conversation</p>
          {#if conversation.data.privacy === Privacy.Private}
            <Button onClick={() => goto(`/conversations/${conversation.data.id}/invite`)} moreClasses='w-72 justify-center'>
              <SvgIcon icon='invite' size='24' color='red' />
              <strong class='ml-2'>Create personal invite code</strong>
            </Button>
          {:else}
            <Button onClick={() => copyToClipboard(conversation.publicInviteCode)} moreClasses='w-64 justify-center'>
              <SvgIcon icon='copy' size='24' color='red' />
              <strong class='ml-2'>Copy invite code</strong>
            </Button>
          {/if}
        </div>
      {:else}
        <div id='message-box' class="flex-1 p-4 flex flex-col-reverse w-full">
          <ul>
            {#each $processedMessages as message (message.hash)}
              {#if message.header}
                <li class='mt-auto mb-5'>
                  <div class="text-center text-sm text-secondary-500">{message.header}</div>
                </li>
              {/if}
              <li class='mt-auto mb-5'>
                <div class='flex items-center'>
                  <Avatar agentPubKey={decodeHashFromBase64(message.authorKey)} size='24' showNickname={false} moreClasses='-ml-30'/>
                  <span class="font-bold ml-3 grow">{@html message.author}</span>
                  <span class="text-surface-200 text-xs"><Time timestamp={message.timestamp} format="h:mm" /></span>
                </div>
                <span class="p-2 max-w-xs self-end mb-2 ml-7">{@html message.content}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
  <div class="w-full p-2 bg-surface-400 flex-shrink-0">
    <!-- have this input when submitted add a conversation to the page data -->
    <form class="flex" method='POST' on:submit={sendMessage} >
      <!-- svelte-ignore a11y-autofocus -->
      <input type="text" bind:this={newMessageInput} bind:value={newMessageText} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Type a message...">
      <button class='pr-2'><SvgIcon icon='caretRight' color='white' size='10' /></button>
    </form>
  </div>
{/if}