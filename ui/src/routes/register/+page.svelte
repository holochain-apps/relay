<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { ProfileCreateStore } from "$store/ProfileCreateStore";
  import { getContext } from "svelte";

  const MIN_FIRST_NAME_LENGTH = 3;

  const profileCreateStoreContext: { getStore: () => ProfileCreateStore } =
    getContext("profileCreateStore");
  let profileCreateStore = profileCreateStoreContext.getStore();

  $: isFirstNameValid = $profileCreateStore.firstName.length >= MIN_FIRST_NAME_LENGTH;

  function submit() {
    if (isFirstNameValid) {
      goto("/register/avatar");
    }
  }
</script>

<Header>
  <img src="/icon.png" alt="Logo" width="16" />
</Header>

<form on:submit|preventDefault={submit} class="contents">
  <div class="flex grow flex-col justify-center">
    <h1 class="h1">{$t("common.what_is_your_name")}</h1>
    <input
      autofocus
      class="bg-surface-500 dark:bg-surface-900 mt-2 border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
      type="text"
      placeholder={$t("common.first_name") + " *"}
      name="firstName"
      bind:value={$profileCreateStore.firstName}
      minlength={MIN_FIRST_NAME_LENGTH}
    />
    <input
      class="bg-surface-500 dark:bg-surface-900 mt-2 border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
      type="text"
      placeholder={$t("common.last_name")}
      name="lastName"
      bind:value={$profileCreateStore.lastName}
    />
  </div>

  <div class="items-right flex w-full justify-end pr-4">
    <Button on:click={submit} disabled={isFirstNameValid}>
      {@html $t("common.next_avatar")}
      <SvgIcon icon="arrowRight" size="42" color={$modeCurrent ? "white" : "%23FD3524"} />
    </Button>
  </div>
</form>
