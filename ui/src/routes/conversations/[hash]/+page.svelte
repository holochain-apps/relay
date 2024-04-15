<script lang="ts">
	import Header from '$lib/Header.svelte';
  import type { ActionData, PageData } from './$types';
	// import { enhance } from '$app/forms';

	export let data: PageData;
	//export let form : ActionData;


  import { chat, sendMessage as addMessage, loadChat } from '$store/Chat';
  // import type { Message } from './types'; // Assuming you have a types file for Message and ChatRoom
  import { onMount, onDestroy } from 'svelte';

  // Create an instance of the chat room store
  // const { subscribe, setMessages } = createChatStore();

  // $: messages: Message[] = [];

  // Subscription to the chatRooms store
  // const unsubscribe = subscribe(value => {
  //   messages = value.messages;
  // });

  onMount(() => {
    //setMessages();
    loadChat();
  });

  // Cleanup the subscription
  // onDestroy(() => {
  //   unsubscribe();
  // });

  let newMessageText = '';

  function sendMessage(e) {
    if (newMessageText.trim()) {
      // const message: Message = {
      //   id: `${Date.now()}`, // Basic unique ID generation
      //   author: 'Tibet Sprague', // This would be dynamic in a real app
      //   timestamp: new Date(),
      //   text: newMessageText
      // };
      addMessage("Tibet", newMessageText);
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
  <h1 class="flex-1">{data.conversation.icon}{data.conversation.title}</h1>
</Header>

<div class="container mx-auto flex justify-center items-center flex-col flex-1 overflow-hidden">
  <h1 class='text-4xl flex-shrink-0'>{@html data.conversation.icon} {@html data.conversation.title}</h1>
  <div id='message-box' class="flex-1 overflow-y-auto p-4 flex flex-col-reverse w-full">
    <ul>
      <!-- {#each data.conversation.messages as message (message.id)} -->
      {#each $chat.messages as message (message.id)}
        <li class='mt-auto mb-5'>
          <div class="p-2">{@html message.timestamp}</div>
          <span class="font-bold">{@html message.author}: </span>
          <span class="p-2 max-w-xs self-end mb-2">{@html message.text}</span>
        </li>
      {/each}
    </ul>
  </div>
  <div class="w-full p-2 bg-surface-400 flex-shrink-0">
    <!-- have this input when submitted add a conversation to the page data -->
    <form class="flex" method='POST' on:submit={sendMessage} >
      <input type="text" bind:value={newMessageText} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Type a message...">
    	<button>Send</button>
    </form>
  </div>
</div>
