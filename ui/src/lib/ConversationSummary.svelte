<script lang="ts">
  import type { ConversationStore } from "$store/ConversationStore";
  import SvgIcon from "./SvgIcon.svelte";

  export let store: ConversationStore;
  $: conversation = store;
  $: messageCount = store.history.messageCount;
  $: status = store.status;
</script>

<li class="text-xl flex flex-row mb-5 items-start">
  <a
    href="/conversations/{$conversation.id}"
    class="flex-1 flex flex-row items-center min-w-0 overflow-hidden"
  >
    {#if $conversation.config.image}
      <img
        src={$conversation.config.image}
        alt="Conversation"
        class="w-9 h-9 rounded-full mr-4 object-cover"
      />
    {:else}
      <span
        class="mr-4 w-9 h-9 flex items-center justify-center bg-surface-400 rounded-full"
        ><SvgIcon icon="group" size="16" color="#ccc" /></span
      >
    {/if}
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden"
        class:unread={$status=='unread'}
    >
      <span class="text-base"
        >{@html $conversation.config.title} ({$messageCount} messages)</span
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