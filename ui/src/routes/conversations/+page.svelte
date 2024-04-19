<script lang="ts">
	import Header from '$lib/Header.svelte';
  // /import type { PageData } from './$types';
  import { chatsListStore } from '$store/ChatsList';

	// export let data: PageData;

  let newConversationName = '';
  function addConversation(e: SubmitEvent) {
    e.preventDefault();
    chatsListStore.addChat(newConversationName);
    newConversationName = '';
  }
</script>

<Header>
	<h1>Inbox</h1>
</Header>

<div class="container h-full mx-auto flex flex-col">
  <h1 class="text-2xl mx-auto p-2 flex-shrink-0">Conversations</h1>
  <ul class="flex-1">
    {#each $chatsListStore as chat (chat.data.id)}
      <li class='text-xl'>
        <a href="/conversations/{chat.data.id}">
          <!-- <span>{@html conversation.icon}</span> -->
          <span>{@html chat.data.name}</span>
        </a>
      </li>
    {/each}
  </ul>
  <div class="w-full p-2 bg-surface-400 flex-shrink-0">
    <!-- have this input when submitted add a conversation to the page data -->
    <form class="flex" method='POST' on:submit={addConversation} >
      <input type="text" bind:value={newConversationName} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Title new conversation...">
      <button>Add</button>
    </form>
  </div>
</div>
