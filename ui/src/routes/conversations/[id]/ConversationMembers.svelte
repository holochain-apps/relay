<script lang="ts">
  import Avatar from "$lib/Avatar.svelte";
  import { ConversationStore } from "$store/ConversationStore";

  export let conversation: ConversationStore;
</script>

{#each conversation.allMembers.slice(0, 2) as contact, i}
  {#if contact}
    <Avatar
      image={contact.avatar}
      agentPubKey={contact.publicKeyB64}
      size={120}
      moreClasses="mb-5"
    />
  {/if}
{/each}

{#if conversation.allMembers.length > 2}
  <div
    class="variant-filled-tertiary mb-5 flex h-10 min-h-10 w-10 items-center justify-center rounded-full"
  >
    <span class="text-xl">+{conversation.allMembers.length - 2}</span>
  </div>
{/if}
