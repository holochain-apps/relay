<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { ProfileCreateStore } from "$store/ProfileCreateStore";
  import HiddenFileInput from "$lib/HiddenFileInput.svelte";
  import toast from "svelte-french-toast";

  const profileCreateStoreContext: { getStore: () => ProfileCreateStore } =
    getContext("profileCreateStore");
  let profileCreateStore = profileCreateStoreContext.getStore();

  async function create() {
    try {
      await profileCreateStore.create();
      goto("/welcome");
    } catch (e) {
      console.error("Failed to create profile", e);
      toast.error("Failed to create profile");
    }
  }
</script>

<Header>
  <img src="/icon.png" alt="Logo" width="16" />
</Header>

<div class="flex grow flex-col items-center justify-center">
  <h1 class="h1 mb-10">{$t("common.select_an_avatar")}</h1>

  <HiddenFileInput
    accept="image/*"
    id="avatarInput"
    on:change={(e) => profileCreateStore.updateAvatar(e.detail)}
  />

  <!-- Label styled as a big clickable icon -->
  <label
    for="avatarInput"
    class="file-icon-label bg-secondary-300 hover:bg-secondary-400 flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full"
  >
    {#if $profileCreateStore.avatar}
      <img
        src={$profileCreateStore.avatar}
        alt="Avatar"
        class="h-32 w-32 rounded-full object-cover"
      />
    {:else}
      <img src="/image-placeholder.png" alt="Avatar Uploader" class="h-16 w-16 rounded-full" />
    {/if}
  </label>
</div>

<div class="items-right flex w-full justify-end pr-4">
  <Button on:click={() => create()}>
    <SvgIcon icon="hand" size="20" color={$modeCurrent ? "white" : "%23FD3524"} />
    <strong class="ml-2">{$t("common.jump_in")}</strong>
  </Button>
</div>
