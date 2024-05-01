<script lang="ts">
	import { getContext, onMount } from 'svelte';
  import Time from "svelte-time";
  import Header from '$lib/Header.svelte';
  import type { ActionData, PageData } from './$types';
	// import { enhance } from '$app/forms';
  import { get } from "svelte/store";
	import { ProfilesStore } from '@holochain-open-dev/profiles';

	//export let form : ActionData;

  //import { chat, sendMessage as addMessage, loadChat } from '$store/Chat';
  // import type { UserStore } from "$store/UserStore";
  // // Retrieve user store from context
	// const userStore: UserStore = getContext('user');
  // $: userName = userStore.name

  const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
	const profilesStore = profilesContext.getStore()
	$: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	$: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as any
  $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""

  export let data: PageData;

  $: chat = data.chat;

  let messages: Message[] = [];


  onMount(() => {
    if (chat) {
      chat.subscribe((c: Chat) => {
        messages = c.messages;
      });
    }
  });

  // Cleanup the subscription
  // onDestroy(() => {
  //   unsubscribe();
  // });

  let newMessageText = '';

  function sendMessage(e: SubmitEvent) {
    if (chat && userName && newMessageText.trim()) {
      chat.addMessage(userName, newMessageText);
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
  <a class='text-4xl mr-5' href="/conversations">⟨</a>
  <h1 class="flex-1">{chat?.data.name}</h1>
</Header>

{#if chat}
  <div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden">
    <h1 class='text-4xl flex-shrink-0'>{@html chat.data.name}</h1>
    <div id='message-box' class="flex-1 overflow-y-auto p-4 flex flex-col-reverse w-full">
      <ul>
        <!-- {#each data.conversation.messages as message (message.id)} -->
        {#each messages as message (message.id)}
          <li class='mt-auto mb-5'>
            <div class="text-center text-sm text-secondary-500"><Time timestamp={message.timestamp} format="ddd, MMM D @ h:m" /></div>
            <span class="font-bold">{@html message.author}: </span>
            <span class="p-2 max-w-xs self-end mb-2">{@html message.text}</span>
          </li>
        {/each}
      </ul>
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