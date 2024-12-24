<script lang="ts">
  import type { RelayStore } from "$store/RelayStore";
  import { getContext } from "svelte";
  import { type Message as MessageType } from "../types";
  import Time from "svelte-time";
  import LightboxImage from "$lib/LightboxImage.svelte";
  import MessageActions from "$lib/MessageActions.svelte";
  import Avatar from "$lib/Avatar.svelte";
  import { press } from "svelte-gestures";
  import { isMobile, linkify, sanitizeHTML } from "./utils";
  import SvgIcon from "./SvgIcon.svelte";
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { createEventDispatcher } from "svelte";
  import type { ActionHashB64 } from "@holochain/client";
  import type { OutsideClickEventDetail } from "../app";

  const dispatch = createEventDispatcher<{
    select: ActionHashB64;
    unselect: undefined;
  }>();

  const relayStoreContext: { getStore: () => RelayStore } = getContext("relayStore");
  let relayStore = relayStoreContext.getStore();
  let myPubKeyB64 = relayStore.client.myPubKeyB64;

  export let message: MessageType;
  export let isSelected: boolean = false;

  $: fromMe = message.authorKey === myPubKeyB64;

  function handleClick() {
    if (isMobile()) return;

    dispatch("select", message.hash);
  }

  function handlePress() {
    if (!isMobile()) return;

    dispatch("select", message.hash);
  }

  function clickOutside(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
        node.dispatchEvent(new CustomEvent<OutsideClickEventDetail>("outsideClick"));
      }
    };
    document.addEventListener("click", handleClick, true);

    return {
      destroy: () => {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }
</script>

{#if message.header}
  <li class="mb-2 mt-auto">
    <div class="text-secondary-400 dark:text-secondary-300 text-center text-xs">
      {message.header}
    </div>
  </li>
{/if}
<li
  class="mt-auto {!message.hideDetails && 'mt-3'} relative {isSelected
    ? 'bg-secondary-500 mb-20 mt-2 rounded-t-xl'
    : ''}"
  data-message-selection={isSelected ? "true" : undefined}
>
  <button
    class="flex w-full {fromMe ? 'justify-end' : 'justify-start'} {isSelected
      ? 'bg-secondary-500 rounded-b-none rounded-t-xl px-2.5 py-1.5'
      : 'bg-transparent'} border-0 bg-transparent text-left"
    use:press={{ timeframe: 300, triggerBeforeFinished: true }}
    on:press={handlePress}
    on:click={handleClick}
    use:clickOutside
    on:outsideClick={() => dispatch("unselect")}
    aria-pressed={isSelected}
    aria-label={`Message from ${fromMe ? "you" : message.author}`}
  >
    {#if !fromMe}
      {#if !message.hideDetails}
        <Avatar
          image={message.avatar}
          agentPubKey={message.authorKey}
          size="24"
          moreClasses="items-start mt-1"
        />
      {:else}
        <span class="inline-block min-w-6"></span>
      {/if}
    {/if}

    <div class="ml-3 w-2/3 {fromMe && 'items-end text-end'}">
      {#if !message.hideDetails}
        <span class="flex items-baseline {fromMe && 'flex-row-reverse opacity-80'}">
          <span class="font-bold">{fromMe ? "You" : message.author}</span>
          <span class="text-xxs mx-2"><Time timestamp={message.timestamp} format="h:mma" /></span>
        </span>
      {/if}

      {#if message.images && message.images.length > 0}
        {#each message.images as image}
          <div class="flex {fromMe ? 'justify-end' : 'justify-start'}">
            {#if image.status === "loaded"}
              <div class="mb-2 flex items-start justify-between">
                <LightboxImage btnClass="inline max-w-2/3" src={image.dataURL} alt={image.name} />
              </div>
            {:else if image.status === "loading" || image.status === "pending"}
              <div class="bg-surface-800 mb-2 flex h-20 w-20 items-center justify-center">
                <SvgIcon icon="spinner" color={$modeCurrent ? "%232e2e2e" : "white"} size="30" />
              </div>
            {:else}
              <div class="bg-surface-800 mb-2 flex h-20 w-20 items-center justify-center">
                <SvgIcon icon="x" color={$modeCurrent ? "%232e2e2e" : "white"} size="30" />
              </div>
            {/if}
          </div>
        {/each}
      {/if}

      <div class="message w-full break-words font-light {fromMe && 'text-end'}">
        {@html sanitizeHTML(linkify(message.content))}
      </div>
    </div>
  </button>

  {#if isSelected}
    <div data-message-actions>
      <MessageActions {message} on:unselect />
    </div>
  {/if}
</li>
