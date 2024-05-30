<script lang="ts">
	import { ProfilesStore, type Profile } from '@holochain-open-dev/profiles';
  import type { AgentPubKeyB64 } from '@holochain/client';
  import { getContext, onDestroy, onMount } from 'svelte';
  import { get, type Readable, type Unsubscriber, derived } from "svelte/store";
  import Time from "svelte-time";
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/Avatar.svelte';
  import Header from '$lib/Header.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { RelayStore } from '$store/RelayStore';
  import { ConversationStore } from '$store/ConversationStore';
  import type { Conversation, Message } from '../../../types';

  const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
	const profilesStore = profilesContext.getStore()
	$: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	$: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as any
  $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""

  $: conversationId = $page.params.id;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  let relayStore = relayStoreContext.getStore()
  let myPubKey = relayStore.client.myPubKeyB64()

  $: conversation = relayStore.getConversation(conversationId);
  let messages: Message[] = [];
  let agentProfiles: { [key: AgentPubKeyB64]: Profile } = {};
  let numMembers = 0;
  let unsubscribe : Unsubscriber;

  onMount(() => {
    if (!conversation) {
      goto('/conversations');
    } else {
      unsubscribe = conversation.subscribe((c: Conversation) => {
        console.log("subscribe got messages", c.messages, " num members", Object.values(c.agentProfiles).length)
        agentProfiles = c.agentProfiles
        messages = c.messages;
        numMembers = Object.values(agentProfiles).length;
      });
      conversation.initialize();
    }
  });

  $: console.log("conversation messages", conversation?.data.messages, messages)
  $: console.log("agent prpfiles", conversation?.data.agentProfiles, agentProfiles, numMembers)

  // Cleanup the subscription
  onDestroy(() => {
    unsubscribe && unsubscribe();
  });

  // Derived store to process messages and add headers
  $: processedMessages = conversation && derived(conversation, ($value) => {
    const messages = ($value as Conversation).messages;
    console.log("processing", messages, ($value as Conversation).agentProfiles)
    const result: Message[] = [];

    let lastDate: Date | null = null;

    messages.forEach(message => {
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

  let newMessageText = '';

  async function sendMessage(e: SubmitEvent) {
    if (conversation && newMessageText.trim()) {
      await conversation.sendMessage(myPubKey, newMessageText);
      newMessageText = ''; // Clear input after sending
      // TODO: wait a minute for latest to load
      const el = document.querySelector('#message-box > ul > li:last-child');
      console.log("el", el)
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: "nearest"
        });
      };
    }
    e.preventDefault();
  }
</script>

<Header>
  <a class='absolute' href="/conversations"><SvgIcon icon='back' color='white' size='10' /></a>
  {#if conversation}
    <h1 class="flex-1 grow text-center">{@html conversation.data.name}</h1>
    <a class='absolute right-5' href="/conversations/{conversation.data.id}/invite"><SvgIcon icon='addPerson' color='white' /></a>
  {/if}
</Header>

{#if conversation && typeof $processedMessages !== 'undefined'}
  <div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden w-full">
    <div class='overflow-y-auto flex flex-col grow items-center w-full'>
      <h1 class='text-4xl flex-shrink-0 mt-10'>{@html conversation.data.name}</h1>
      <p class='text-surface-300'>{@html numMembers } {#if numMembers === 1}Member{:else}Members{/if}</p>
      <div id='message-box' class="flex-1 p-4 flex flex-col-reverse w-full">
        <ul>
          {#each $processedMessages as message (message.id)}
            {#if message.header}
              <li class='mt-auto mb-5'>
                <div class="text-center text-sm text-secondary-500">{message.header}</div>
              </li>
            {/if}
            <li class='mt-auto mb-5'>
              <div class='flex items-center'>
                <Avatar image={message.avatar} size='24' placeholder={true} showNickname={false} moreClasses='-ml-30'/>
                <span class="font-bold ml-3 grow">{@html message.author}</span>
                <span class="text-surface-200 text-xs"><Time timestamp={message.timestamp} format="h:mm" /></span>
              </div>
              <span class="p-2 max-w-xs self-end mb-2 ml-7">{@html message.content}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <div class="w-full p-2 bg-surface-400 flex-shrink-0">
      <!-- have this input when submitted add a conversation to the page data -->
      <form class="flex" method='POST' on:submit={sendMessage} >
        <!-- svelte-ignore a11y-autofocus -->
        <input type="text" bind:value={newMessageText} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Type a message...">
        <button>Send</button>
      </form>
    </div>
  </div>
{/if}