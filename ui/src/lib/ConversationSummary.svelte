<script lang="ts">
  import type { ConversationStore } from "$store/ConversationStore";
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import Avatar from "./Avatar.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import { Privacy } from "../types";

  export let store: ConversationStore;
  $: conversation = store.conversation;
  $: messageCount = store.history.messageCount;
  $: status = store.status;
  $: lastMessage = store.lastMessage
  $: lastMessageAuthor = $lastMessage ? $conversation.agentProfiles[$lastMessage.authorKey].fields.firstName : null
  $: allMembers = store.allMembers
</script>

<li class="text-xl flex flex-row mb-5 items-start">
  <a
    href="/conversations/{$conversation.id}"
    class="flex-1 flex flex-row items-center min-w-0"
  >
    {#if $conversation.privacy === Privacy.Private}
      <div class='flex items-center justify-center relative'>
        {#if allMembers.length == 1}
          <Avatar image={allMembers[0]?.avatar} agentPubKey={allMembers[0]?.publicKeyB64} size={40} />
        {:else if allMembers.length == 2}
          <Avatar image={allMembers[0]?.avatar} agentPubKey={allMembers[0]?.publicKeyB64} size={22} moreClasses='' />
          <Avatar image={allMembers[1]?.avatar} agentPubKey={allMembers[1]?.publicKeyB64} size={22} moreClasses='relative -ml-1' />
        {:else}
          <Avatar image={allMembers[0]?.avatar} agentPubKey={allMembers[0]?.publicKeyB64} size={22} moreClasses='relative -mb-2' />
          <Avatar image={allMembers[1]?.avatar} agentPubKey={allMembers[1]?.publicKeyB64} size={22} moreClasses='relative -ml-3 -mt-3' />
          <div class='w-4 h-4 p-2 rounded-full variant-filled-tertiary flex items-center justify-center relative -ml-2 -mb-3'>
            <span class='text-xxs'>+{(allMembers.length - 2)}</span>
          </div>
        {/if}
      </div>
    {:else if $conversation.config.image}
      <img src={$conversation.config.image} alt='Conversation' class='w-10 h-10 rounded-full object-cover' />
    {:else}
      <span class='w-10 h-10 flex items-center justify-center bg-secondary-300 dark:bg-secondary-400 rounded-full'>
        <SvgIcon icon='group' size='20' color='#ccc' />
      </span>
    {/if}
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden ml-4"
      class:unread={$status === 'unread'}
    >
      <span class="text-base">{store.title}</span>
      <span class="text-nowrap overflow-hidden text-ellipsis text-xs min-w-0 flex items-center">
        {#if $status === 'unread'}
          <span class="bg-primary-500 rounded-full w-2 h-2 inline-block mr-2"></span>
        {/if}
        {#if $lastMessage}
          {lastMessageAuthor || ""}:
          {$lastMessage.content || ""}
        {/if}
      </span>
    </div>
  </a>
  <span
    class="text-xs flex text-secondary-300 flex-row items-center top-1 relative"
  >
    <SvgIcon icon="person" size="8" color={$modeCurrent ? "#aaa" : "#ccc"} />
    <span class="ml-2">{Object.values($conversation.agentProfiles).length}</span>
  </span>
</li>

<style>
  .unread {
    font-weight: bold;
  }
</style>
