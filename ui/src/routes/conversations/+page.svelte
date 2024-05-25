<script lang="ts">
	import { getContext } from 'svelte';
	import { get, type Writable } from "svelte/store";
  import { decode } from '@msgpack/msgpack';
  import { goto } from '$app/navigation';
  import { Base64 } from 'js-base64';
  import Header from '$lib/Header.svelte';
  // /import type { PageData } from './$types';
  import { RelayStore } from '$store/RelayStore';
  import { ProfilesStore } from '@holochain-open-dev/profiles';
  import type { Invitation } from '../../types';

	// export let data: PageData;

  const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
	let relayStore = relayStoreContext.getStore()

  // const profilesContext: { getStore: () => ProfilesStore } = getContext('profiles')
  // let profilesStore = profilesContext.getStore()
	// $: myProfileNow = profilesStore ? get(profilesStore.myProfile) : null
	// $: myProfileValue = myProfileNow && myProfileNow.status === 'complete' && myProfileNow.value as any
  // $: userName = myProfileValue ? myProfileValue.entry.nickname  : ""

  let newConversationName = '';
  async function createConversation(e: SubmitEvent) {
    e.preventDefault();
    const conversation = await relayStore.createConversation(newConversationName);
    newConversationName = '';
    goto('/conversations/' + conversation?.data.id); // navigate to new conversation page
  }

  let inviteCode = '';
  async function joinConversation(e: SubmitEvent) {
    e.preventDefault();
    const msgpack = Base64.toUint8Array(inviteCode)
    try {
      const invitation : Invitation = decode(msgpack) as Invitation;
      await relayStore.joinConversation(invitation)
      inviteCode = '';
    } catch(e) {
      alert(`error decoding invitation: ${e}`)
    }
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
  <div class="w-full p-2 bg-surface-400 flex-shrink-0 mt-4">
    <form class="flex" method='POST' on:submit={joinConversation} >
      <input type="text" bind:value={inviteCode} autofocus class="w-full bg-surface-400 placeholder:text-gray-400 focus:border-gray-500 focus:ring-0 border-0" placeholder="Enter invite code">
      <button>Join</button>
    </form>
  </div>
</div>
