<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { ProfileCreateStore } from "$store/ProfileCreateStore";

  const MIN_FIRST_NAME_LENGTH = 3;
  let firstName = "";
  let lastName = "";

  $: {
    // Subscribe to the store and update local state
    ProfileCreateStore.subscribe(($profile) => {
      firstName = $profile.firstName;
      lastName = $profile.lastName;
    });
  }

  function saveName() {
    firstName = firstName.trim();
    lastName = lastName.trim();
    ProfileCreateStore.update((current) => {
      return { ...current, firstName, lastName };
    });
    if (firstName.length >= MIN_FIRST_NAME_LENGTH) {
      goto("/register/avatar");
    }
  }
</script>

<Header>
  <img src="/icon.png" alt="Logo" width="16" />
</Header>

<form on:submit|preventDefault={saveName} class="contents">
  <div class="flex grow flex-col justify-center">
    <h1 class="h1">{$t("common.what_is_your_name")}</h1>
    <input
      autofocus
      class="mt-2 border-none bg-surface-500 pl-0.5 outline-none focus:outline-none focus:ring-0 dark:bg-surface-900"
      type="text"
      placeholder={$t("common.first_name") + " *"}
      name="firstName"
      bind:value={firstName}
      minlength={MIN_FIRST_NAME_LENGTH}
    />
    <input
      class="mt-2 border-none bg-surface-500 pl-0.5 outline-none focus:outline-none focus:ring-0 dark:bg-surface-900"
      type="text"
      placeholder={$t("common.last_name")}
      name="lastName"
      bind:value={lastName}
    />
  </div>

  <div class="items-right flex w-full justify-end pr-4">
    <Button on:click={saveName} disabled={firstName.trim().length < MIN_FIRST_NAME_LENGTH}>
      {@html $t("common.next_avatar")}
      <SvgIcon icon="arrowRight" size="42" color={$modeCurrent ? "white" : "%23FD3524"} />
    </Button>
  </div>
</form>
