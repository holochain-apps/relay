<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
  import Header from '$lib/Header.svelte';
  // /import type { PageData } from './$types';
  import { RelayStore } from '$store/RelayStore';
  import { ProfilesStore } from '@holochain-open-dev/profiles';

	// export let data: PageData;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
  let profilesStore = profilesContext.getStore()
	$: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	$: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as any
  $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""

  let newConversationName = '';
  function createConversation(e: SubmitEvent) {
    e.preventDefault();
    relayStore.createConversation(userName, newConversationName);
    newConversationName = '';
  }
</script>

<Header>
  <a class='text-4xl mr-5' href="/">⟨</a>
	<h1>Home</h1>
</Header>

<div class="container h-full mx-auto flex flex-col">
  <h1 class="text-2xl mx-auto p-2 flex-shrink-0">Conversations</h1>
  <ul class="flex-1">
    {#each $relayStore as $conversation ($conversation.data.name)}
      {@debug $conversation}
      <li class='text-xl'>
        <a href="/conversations/{$conversation.data.id}">
          <span>{@html $conversation.data.name}</span>
        </a>
      </li>
    {/each}
  </ul>
  <div class="w-full p-2 bg-surface-400 flex-shrink-0">
    <!-- have this input when submitted add a conversation to the page data -->
    <form class="flex" method='POST' on:submit={createConversation} >
      <input type="text" bind:value={newConversationName} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Title new conversation...">
      <button>Add</button>
    </form>
  </div>
</div>
