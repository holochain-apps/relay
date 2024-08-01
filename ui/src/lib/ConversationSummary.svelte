<script lang="ts">
  import type { ConversationStore } from "$store/ConversationStore";
  import Avatar from "./Avatar.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import { Privacy } from "../types";

  export let store: ConversationStore;
  $: conversation = store;
  $: messageCount = store.history.messageCount;
  $: status = store.status;
</script>

<li class="text-xl flex flex-row mb-5 items-start">
  <a
    href="/conversations/{$conversation.id}"
    class="flex-1 flex flex-row items-center min-w-0"
  >
    {#if $conversation.privacy === Privacy.Private}
      <div class='flex items-center justify-center relative'>
        {#if $conversation.invitedContacts.length == 1}
          <Avatar image={$conversation.invitedContacts[0]?.avatar} agentPubKey={$conversation.invitedContacts[0]?.publicKeyB64} size={40} />
        {:else if $conversation.invitedContacts.length == 2}
          <Avatar image={$conversation.invitedContacts[0]?.avatar} agentPubKey={$conversation.invitedContacts[0]?.publicKeyB64} size={22} moreClasses='' />
          <Avatar image={$conversation.invitedContacts[1]?.avatar} agentPubKey={$conversation.invitedContacts[1]?.publicKeyB64} size={22} moreClasses='relative -ml-1' />
        {:else}
          <Avatar image={$conversation.invitedContacts[0]?.avatar} agentPubKey={$conversation.invitedContacts[0]?.publicKeyB64} size={22} moreClasses='relative -mb-2' />
          <Avatar image={$conversation.invitedContacts[1]?.avatar} agentPubKey={$conversation.invitedContacts[1]?.publicKeyB64} size={22} moreClasses='relative -ml-3 -mt-3' />
          <div class='w-4 h-4 p-2 rounded-full bg-surface-400 flex items-center justify-center relative -ml-2 -mb-3'>
            <span class='text-primary-100 text-xxs'>+{($conversation.invitedContacts.length - 2)}</span>
          </div>
        {/if}
      </div>
    {:else if $conversation.data.config.image}
      <img src={$conversation.data.config.image} alt='Conversation' class='w-10 h-10 rounded-full object-cover' />
    {:else}
      <span class='mr-4 w-10 h-10 flex items-center justify-center bg-surface-400 rounded-full'><SvgIcon icon='group' size='20' color='#ccc' /></span>
    {/if}
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden ml-4"
      class:unread={$status=='unread'}
    >
      <span class="text-base"
        >{@html $conversation.title} ({$messageCount} messages)</span
      >
      <span class="text-nowrap overflow-hidden text-ellipsis text-xs min-w-0">
        {@html Object.values($conversation.messages).at(-1)?.content || ""}
      </span>
    </div>
  </a>
  <span
    class="text-xs text-surface-200 flex flex-row items-center top-1 relative"
  >
    <SvgIcon icon="person" size="8" color="#ccc" />
    <span class="ml-2">{Object.values($conversation.agentProfiles).length}</span
    >
  </span>
</li>

<style>
  .unread {
    font-weight: bold;
  }
</style>
