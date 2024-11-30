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
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import toast from "svelte-french-toast";

  const profilesStoreContext: { getStore: () => ProfilesStore } = getContext("profilesStore");
  let profilesStore = profilesStoreContext.getStore();

  async function createAccount() {
    try {
      await profilesStore.client.createProfile({
        nickname: `${$ProfileCreateStore.firstName} ${$ProfileCreateStore.lastName}`,
        fields: {
          avatar: $ProfileCreateStore.avatar,
          firstName: $ProfileCreateStore.firstName,
          lastName: $ProfileCreateStore.lastName,
        },
      });
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
    on:change={(e) => ProfileCreateStore.update((current) => ({ ...current, avatar: e.detail }))}
  />

  <!-- Label styled as a big clickable icon -->
  <label
    for="avatarInput"
    class="file-icon-label bg-secondary-300 hover:bg-secondary-400 flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full"
  >
    {#if $ProfileCreateStore.avatar}
      <img
        src={$ProfileCreateStore.avatar}
        alt="Avatar"
        class="h-32 w-32 rounded-full object-cover"
      />
    {:else}
      <img src="/image-placeholder.png" alt="Avatar Uploader" class="h-16 w-16 rounded-full" />
    {/if}
  </label>
</div>

<div class="items-right flex w-full justify-end pr-4">
  <Button on:click={() => createAccount()}>
    <SvgIcon icon="hand" size="20" color={$modeCurrent ? "white" : "%23FD3524"} />
    <strong class="ml-2">{$t("common.jump_in")}</strong>
  </Button>
</div>
