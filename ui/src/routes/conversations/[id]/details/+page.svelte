<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { encodeHashToBase64 } from "@holochain/client";
  import { page } from "$app/stores";
  import Avatar from "$lib/Avatar.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import {
    copyToClipboard,
    handleFileChange,
    isMobile,
    MIN_TITLE_LENGTH,
    shareText,
  } from "$lib/utils";
  import type { RelayStore } from "$store/RelayStore";
  import { Privacy, type Config } from "../../../../types";
  import Button from "$lib/Button.svelte";

  // Silly hack to get around issues with typescript in sveltekit-i18n
  const tAny = t as any;

  $: conversationId = $page.params.id;
  const relayStoreContext: { getStore: () => RelayStore } = getContext("relayStore");
  let relayStore = relayStoreContext.getStore();
  const myPublicKey64 = relayStore.client.myPubKeyB64;
  $: conversation = relayStore.getConversation(conversationId);

  // used for editing Group conversation details
  $: image = conversation ? conversation.data?.config.image : undefined;
  $: title = conversation ? conversation.data?.config.title : undefined;

  let editingTitle = false;
  let titleElem: HTMLInputElement;

  const saveTitle = async () => {
    if (conversation && titleElem.value) {
      await updateConfig({
        image: image || conversation?.data?.config.image,
        title: titleElem.value.trim(),
      });
      title = titleElem.value;
      editingTitle = false;
    }
  };

  const cancelEditTitle = () => {
    editingTitle = false;
    title = conversation?.data?.config.title;
  };

  const updateConfig = async (config: Config) => {
    if (!conversation) return;
    await conversation.updateConfig(config);
    image = config.image;
    title = config.title;
  };
</script>

<Header>
  <a class="absolute z-10 pr-5" href={`/conversations/${conversationId}`}
    ><SvgIcon icon="caretLeft" color={$modeCurrent ? "%232e2e2e" : "white"} size="10" /></a
  >
  {#if conversation}
    <h1 class="flex-1 grow text-center">
      {#if conversation.data.privacy === Privacy.Public}{$t(
          "conversations.group_details",
        )}{:else}{conversation.title}{/if}
    </h1>
    {#if conversation.data.privacy === Privacy.Private && encodeHashToBase64(conversation.data.progenitor) === relayStore.client.myPubKeyB64}
      <a class="absolute right-5" href="/conversations/{conversation.data.id}/invite"
        ><SvgIcon icon="addPerson" color="white" /></a
      >
    {/if}
  {/if}
</Header>

{#if conversation}
  {@const numMembers = Object.values(conversation.data.agentProfiles).length}

  <div
    class="container relative mx-auto flex w-full flex-1 flex-col items-center overflow-hidden pt-10"
  >
    {#if conversation.privacy === Privacy.Private}
      <div class="flex items-center justify-center gap-4">
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
      </div>
    {:else}
      <!-- Hidden file input -->
      <input
        type="file"
        id="avatarInput"
        accept="image/jpeg, image/png, image/gif"
        class="hidden"
        on:change={(event) =>
          handleFileChange(event, (imageData) => {
            updateConfig({ image: imageData, title: title || conversation.data?.config.title });
          })}
      />
      {#if image}
        <div style="position:relative">
          <img src={image} alt="Group" class="mb-5 h-32 min-h-32 w-32 rounded-full object-cover" />
          <label
            for="avatarInput"
            class="absolute bottom-5 right-0 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-secondary-200 pl-1 hover:bg-secondary-300 dark:bg-secondary-500 dark:hover:bg-secondary-400"
          >
            <SvgIcon icon="image" color={$modeCurrent ? "%232e2e2e" : "white"} />
          </label>
        </div>
      {:else}
        <label
          for="avatarInput"
          class="flex h-32 min-h-32 w-32 cursor-pointer items-center justify-center rounded-full rounded-full bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-500 dark:hover:bg-secondary-400"
        >
          <SvgIcon icon="image" size="44" color={$modeCurrent ? "%232e2e2e" : "white"} />
        </label>
      {/if}
    {/if}
    {#if editingTitle}
      <div class="flex flex-row flex-wrap items-center justify-center">
        <input
          autofocus
          class="grow border-none bg-surface-900 pl-0.5 pt-0 text-center text-3xl outline-none focus:outline-none focus:ring-0"
          type="text"
          placeholder={$t("conversations.enter_name_here")}
          name="title"
          bind:this={titleElem}
          value={title}
          minlength={MIN_TITLE_LENGTH}
          on:keydown={(event) => {
            if (event.key === "Enter") saveTitle();
            if (event.key === "Escape") cancelEditTitle();
          }}
        />
        <div class="flex flex-none items-center justify-center">
          <Button
            moreClasses="h-6 w-6 rounded-md py-0 !px-0 mb-0 mr-2 bg-primary-100 flex items-center justify-center"
            onClick={() => saveTitle()}
          >
            <SvgIcon icon="checkMark" color="%23FD3524" size="12" />
          </Button>
          <Button
            moreClasses="h-6 w-6 !px-0 py-0 mb-0 rounded-md bg-surface-400 flex items-center justify-center"
            onClick={() => cancelEditTitle()}
          >
            <SvgIcon icon="x" color="gray" size="12" />
          </Button>
        </div>
      </div>
    {:else}
      <div class="flex">
        <h1 class="mb-1 mr-1 break-all text-3xl">
          {title}
        </h1>
        {#if conversation.privacy !== Privacy.Private}
          <button on:click={() => (editingTitle = true)}>
            <SvgIcon icon="write" size="24" color="gray" moreClasses="cursor-pointer" />
          </button>
        {/if}
      </div>
    {/if}
    <p class="text-sm">{$tAny("conversations.created", { date: conversation.created })}</p>
    <p class="text-sm">{$tAny("conversations.num_members", { count: numMembers })}</p>

    <div class="container mx-auto flex flex-col overflow-y-auto px-4">
      <ul class="mt-10 flex-1">
        {#if conversation.privacy === Privacy.Public}
          <li
            class="variant-filled-primary mb-2 flex flex-row items-center rounded-full p-2 text-xl"
          >
            <span
              class="inline-block flex h-10 w-10 items-center justify-center rounded-full bg-surface-500"
            >
              <SvgIcon icon="addPerson" size="24" color="%23FD3524" />
            </span>
            <span class="ml-4 flex-1 text-sm font-bold">{$t("conversations.add_members")}</span>
            <button
              class="mr-1 flex items-center justify-center rounded-full bg-surface-500 px-2 py-2 text-xs font-bold text-secondary-500"
              on:click={() => copyToClipboard(conversation.publicInviteCode)}
            >
              <SvgIcon icon="copy" size="14" color="%23FD3524" moreClasses="mr-2" />
              {$t("conversations.copy_invite")}
            </button>
            {#if isMobile()}
              <button
                class="mr-1 flex items-center justify-center rounded-full bg-surface-500 px-2 py-2 text-xs font-bold text-secondary-500"
                on:click={() => shareText(conversation.publicInviteCode)}
              >
                <SvgIcon icon="share" size="14" color="%23FD3524" moreClasses="mr-1" />
              </button>
            {/if}
          </li>
        {/if}
        {#if conversation.invitedUnjoined.length > 0}
          <h3 class="text-md mb-2 font-light text-secondary-300">
            {$t("conversations.unconfirmed_invitations")}
          </h3>
          {#each conversation.invitedUnjoined as contact}
            <li class="mb-4 flex flex-row items-center px-2 text-xl">
              <Avatar
                image={contact.avatar}
                agentPubKey={contact.publicKeyB64}
                size="38"
                moreClasses="-ml-30"
              />
              <span class="ml-4 flex-1 text-sm">{contact.firstName + " " + contact.lastName}</span>
              <button
                class="variant-filled-tertiary flex items-center justify-center rounded-2xl p-2 px-3 text-sm font-bold"
                on:click={() =>
                  copyToClipboard(conversation.inviteCodeForAgent(contact.publicKeyB64))}
              >
                <SvgIcon icon="copy" size="18" color="%23FD3524" moreClasses="mr-2" />
                {$t("conversations.copy_invite")}
              </button>
              {#if isMobile()}
                <button
                  class="variant-filled-tertiary flex items-center justify-center rounded-2xl p-2 px-3 text-sm font-bold"
                  on:click={() => shareText(conversation.inviteCodeForAgent(contact.publicKeyB64))}
                >
                  <SvgIcon icon="share" size="18" color="%23FD3524" moreClasses="mr-2" />
                </button>
              {/if}
            </li>
          {/each}
        {/if}

        {#if conversation.privacy === Privacy.Private}
          <h3 class="text-md mb-2 mt-4 font-light text-secondary-300">
            {$t("conversations.members")}
          </h3>
        {/if}
        <li class="mb-4 flex flex-row items-center px-2 text-xl">
          <Avatar agentPubKey={myPublicKey64} size="38" moreClasses="-ml-30" />
          <span class="ml-4 flex-1 text-sm font-bold">{$t("conversations.you")}</span>
          {#if myPublicKey64 === encodeHashToBase64(conversation.data.progenitor)}
            <span class="ml-2 text-xs text-secondary-300">{$t("conversations.admin")}</span>
          {/if}
        </li>
        {#each conversation.memberList() as contact}
          <li class="mb-4 flex flex-row items-center px-2 text-xl">
            <Avatar
              image={contact.avatar}
              agentPubKey={contact.publicKeyB64}
              size="38"
              moreClasses="-ml-30"
            />
            <span class="ml-4 flex-1 text-sm font-bold"
              >{contact.firstName + " " + contact.lastName}</span
            >
            {#if contact.publicKeyB64 === encodeHashToBase64(conversation.data.progenitor)}
              <span class="ml-2 text-xs text-secondary-300">{$t("conversations.admin")}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
