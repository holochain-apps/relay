<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { writable, get } from "svelte/store";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { handleFileChange, MIN_TITLE_LENGTH } from "$lib/utils";
  import { RelayStore } from "$store/RelayStore";
  import { Privacy } from "../../../types";

  const relayStoreContext: { getStore: () => RelayStore } = getContext("relayStore");
  let relayStore = relayStoreContext.getStore();

  let title = "";
  let imageUrl = writable("");
  let pendingCreate = false;

  async function createConversation(e: Event, privacy: Privacy) {
    pendingCreate = true;
    e.preventDefault();
    const conversation = await relayStore.createConversation(title, get(imageUrl), privacy);
    if (conversation) {
      goto(`/conversations/${conversation.data.id}`);
      pendingCreate = false;
    }
  }

  $: valid = title.trim().length >= MIN_TITLE_LENGTH;
</script>

<Header>
  <button class="absolute z-10 pr-5 text-4xl" on:click={() => history.back()}
    ><SvgIcon icon="caretLeft" color={$modeCurrent ? "%232e2e2e" : "white"} size="10" /></button
  >
  <h1 class="flex-1 text-center">{$t("common.new_group")}</h1>
</Header>

<div class="my-10 flex flex-col items-center justify-center">
  <!-- Hidden file input -->
  <input
    type="file"
    id="avatarInput"
    accept="image/jpeg, image/png, image/gif"
    class="hidden"
    on:change={(event) => handleFileChange(event, (imageData) => imageUrl.set(imageData))}
  />

  <!-- Label styled as a big clickable icon -->
  <label
    for="avatarInput"
    class="file-icon-label flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400"
  >
    {#if $imageUrl}
      <img src={$imageUrl} alt="Avatar" class="h-32 w-32 rounded-full object-cover" />
    {:else}
      <SvgIcon icon="image" size="44" color={$modeCurrent ? "%232e2e2e" : "white"} />
    {/if}
  </label>
</div>

<div class="flex min-w-[66%] grow flex-col justify-start">
  <h1 class="h1">{$t("conversations.group_name")}</h1>
  <input
    autofocus
    class="mt-2 w-full border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
    type="text"
    placeholder={$t("conversations.enter_name_here")}
    name="title"
    bind:value={title}
    minlength={MIN_TITLE_LENGTH}
  />
</div>

<footer>
  <Button
    moreClasses="w-72 justify-center variant-filled-tertiary"
    onClick={(e) => {
      createConversation(e, Privacy.Public);
    }}
    disabled={!valid || pendingCreate}
  >
    {#if pendingCreate}
      <SvgIcon icon="spinner" size="18" color={$modeCurrent ? "%232e2e2e" : "white"} />
    {/if}
    <strong class="ml-2">{$t("conversations.create_group")}</strong>
  </Button>
</footer>
