<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { writable, get } from "svelte/store";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$translations";
  import { MIN_TITLE_LENGTH } from "$config";
  import { RelayStore } from "$store/RelayStore";
  import { Privacy } from "../../../types";
  import toast from "svelte-french-toast";
  import HiddenFileInput from "$lib/HiddenFileInput.svelte";

  const relayStoreContext: { getStore: () => RelayStore } = getContext("relayStore");
  let relayStore = relayStoreContext.getStore();

  let title = "";
  let imageUrl = writable("");
  let pendingCreate = false;

  async function createConversation(privacy: Privacy) {
    pendingCreate = true;
    try {
      const conversation = await relayStore.createConversation(title, get(imageUrl), privacy);
      if (conversation) {
        goto(`/conversations/${conversation.data.id}`);
        pendingCreate = false;
      }
    } catch (e) {
      toast.error(`${$t("common.create_conversation_error")}: ${e.message}`);
    }
  }

  $: valid = title.trim().length >= MIN_TITLE_LENGTH;
</script>

<Header back title={$t("common.new_group")} />

<div class="my-10 flex flex-col items-center justify-center">
  <HiddenFileInput
    id="avatarInput"
    accept="image/jpeg, image/png, image/gif"
    on:change={(event) => {
      try {
        imageUrl.set(event.detail);
      } catch (e) {
        toast.error(`${$t("common.upload_image_error")}: ${e.message}`);
      }
    }}
  />

  <!-- Label styled as a big clickable icon -->
  <label
    for="avatarInput"
    class="file-icon-label bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400 flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full"
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
    on:click={() => createConversation(Privacy.Public)}
    disabled={!valid || pendingCreate}
  >
    {#if pendingCreate}
      <SvgIcon icon="spinner" size="18" color={$modeCurrent ? "%232e2e2e" : "white"} />
    {/if}
    <strong class="ml-2">{$t("conversations.create_group")}</strong>
  </Button>
</footer>
