<script lang="ts">
  import { isEmpty, isEqual } from "lodash-es";
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { get } from "svelte/store";
  import {
    decodeHashFromBase64,
    HASH_TYPE_PREFIX,
    sliceHashType,
    type AgentPubKey,
    type AgentPubKeyB64,
  } from "@holochain/client";
  import { goto } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { copyToClipboard, isMobile, shareText } from "$lib/utils";
  import HiddenFileInput from "$lib/HiddenFileInput.svelte";
  import type { Contact2 } from "../../types";
  import type { AllContactsStore } from "$store/AllContactsStore";
  import { MIN_FIRST_NAME_LENGTH } from "$lib/constants";

  // Silly thing to get around typescript issues with sveltekit-i18n
  const tAny = t as any;

  const contactsStoreContext: { getStore: () => AllContactsStore } = getContext("contactsStore");
  let contactsStore = contactsStoreContext.getStore();

  const myPubKeyContext: { getMyPubKey: () => AgentPubKey } = getContext("myPubKey");
  let myPubKey = myPubKeyContext.getMyPubKey();

  export let agentPubKeyB64: AgentPubKeyB64 | undefined = undefined;
  export let creating = false;

  let existingContactExtended = agentPubKeyB64
    ? get(contactsStore.contacts)[agentPubKeyB64]
    : undefined;
  let firstName = existingContactExtended ? existingContactExtended.contact.first_name : "";
  let lastName = existingContactExtended ? existingContactExtended.contact.last_name : "";
  let avatar = existingContactExtended ? existingContactExtended.contact.avatar : "";

  let editing = !agentPubKeyB64 || creating;
  let pendingSave = false;

  /**
   * Form validity
   */
  let agentPubKey: Uint8Array;
  $: {
    try {
      if (agentPubKeyB64) {
        console.log("trying to decode");
        agentPubKey = decodeHashFromBase64(agentPubKeyB64);
      }
    } catch (e) {
      console.log("failed");
    }
  }

  $: firstNameEmpty = firstName.trim().length < MIN_FIRST_NAME_LENGTH;
  $: agentPubKeyB64Empty = agentPubKeyB64 === undefined || agentPubKeyB64.trim().length === 0;
  $: agentPubKeyB64InvalidType =
    agentPubKey && !isEqual(HASH_TYPE_PREFIX.Agent, sliceHashType(agentPubKey));
  $: agentPubKeyB64InvalidLength = agentPubKey?.length !== 39;
  $: agentPubKeyB64Invalid = agentPubKeyB64InvalidLength || agentPubKeyB64InvalidType;
  $: agentPubKeyB64ContactAlreadyExists =
    !existingContactExtended && agentPubKeyB64 && agentPubKeyB64 in contactsStore.contacts;
  $: isMyOwnAgentContact = myPubKey === agentPubKey;
  $: valid =
    !firstNameEmpty &&
    !agentPubKeyB64Empty &&
    !agentPubKeyB64Invalid &&
    !agentPubKeyB64ContactAlreadyExists &&
    !isMyOwnAgentContact;

  /**
   * Error display
   */
  let error = "";
  $: {
    if (pendingSave) {
      error = "";
    } else if (firstNameEmpty || agentPubKeyB64Empty) {
      error = "";
    } else if (agentPubKeyB64Invalid) {
      error = $t("contacts.invalid_contact_code");
    } else if (agentPubKeyB64ContactAlreadyExists) {
      error = $t("contacts.contact_already_exist");
    } else if (isMyOwnAgentContact) {
      error = $t("contacts.cant_add_yourself");
    } else {
      error = "";
    }
  }

  async function saveContact() {
    if (!valid || !agentPubKeyB64) return;

    pendingSave = true;

    try {
      const newContactData: Contact2 = {
        avatar,
        first_name: firstName,
        last_name: lastName,
        public_key: agentPubKey,
      };

      if (existingContactExtended) {
        await updateContact(newContactData);
      } else {
        await createContact(newContactData);
      }
    } catch (e) {
      console.error(e);
      error = $tAny("contacts.error_saving", { updating: !!existingContactExtended });
    }

    pendingSave = false;
    editing = false;
  }

  async function updateContact(newContactData: Contact2) {
    const agentPubKeyB64 = await contactsStore.update(newContactData);
    const contactExtended = get(contactsStore.contacts)[agentPubKeyB64];

    existingContactExtended = contactExtended;
  }

  async function createContact(newContactData: Contact2) {
    const agentPubKeyB64 = await contactsStore.create(newContactData);
    const contactExtended = get(contactsStore.contacts)[agentPubKeyB64];

    goto(`/conversations/${contactExtended.privateConversationId}`);
  }

  function cancel() {
    if (!agentPubKeyB64 || creating) {
      history.back();
    } else {
      editing = false;
    }
  }
</script>

<div class="flex w-full max-w-2xl flex-1 flex-col items-center p-4">
  <div class="mb-5 mt-6 flex flex-col items-center justify-center">
    <HiddenFileInput
      accept="image/jpeg, image/png, image/gif"
      id="avatarInput"
      on:change={(e) => {
        editing = true;
        avatar = e.detail;
      }}
    />

    <!-- Label styled as a big clickable icon -->
    {#if avatar}
      <div class="relative">
        <img src={avatar} alt="Avatar" class="h-32 w-32 rounded-full object-cover" />
        <label
          for="avatarInput"
          class="bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400 absolute bottom-0 right-0 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full pl-1"
        >
          <SvgIcon icon="image" color={$modeCurrent ? "%232e2e2e" : "white"} />
        </label>
      </div>
    {:else}
      <label
        for="avatarInput"
        class="bg-tertiary-500 hover:bg-tertiary-600 dark:bg-secondary-500 dark:hover:bg-secondary-400 flex h-32 w-32 cursor-pointer items-center justify-center rounded-full rounded-full"
      >
        <SvgIcon icon="image" size="44" color={$modeCurrent ? "%232e2e2e" : "white"} />
      </label>
    {/if}
  </div>

  {#if editing}
    <div class="flex w-full grow flex-col justify-start px-8">
      <h3 class="h3">{$t("common.first_name")} *</h3>
      <input
        autofocus
        class="bg-surface-900 w-full border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
        type="text"
        placeholder={$t("contacts.enter_first_name")}
        name="name"
        bind:value={firstName}
        minlength={1}
      />

      <h3 class="h3 mt-4">{$t("common.last_name")}</h3>
      <input
        class="bg-surface-900 w-full border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
        type="text"
        placeholder={$t("contacts.enter_last_name")}
        name="name"
        bind:value={lastName}
      />

      <h3 class="h3 mt-4">{$t("contacts.contact_code")} *</h3>
      <input
        class="bg-surface-900 w-full w-full border-none pl-0.5 outline-none focus:outline-none focus:ring-0"
        type="text"
        placeholder={$t("contacts.enter_contact_code")}
        name="publicKey"
        bind:value={agentPubKeyB64}
        minlength={1}
      />
      {#if !isEmpty(error)}
        <p class="text-error-500 ml-1 mt-1 text-xs">{error}</p>
      {/if}
      {#if !existingContactExtended}
        <p class="text-secondary-600 dark:text-tertiary-700 mb-4 mt-4 text-xs">
          {$t("contacts.request_contact_code")}
        </p>
      {/if}
    </div>

    <footer class="flex justify-center">
      <Button
        moreClasses="w-36 justify-center !variant-filled-tertiary dark:!variant-filled-secondary"
        on:click={() => cancel()}
      >
        <strong class="">{$t("common.cancel")}</strong>
      </Button>
      <Button
        moreClasses="w-48 ml-4 justify-center !variant-filled-secondary dark:!variant-filled-tertiary disabled:border disabled:!border-tertiary-700 disabled:!bg-surface-500 disabled:!text-tertiary-700 disabled:!opacity-100 dark:disabled:!bg-secondary-900 dark:disabled:!text-tertiary-700"
        on:click={() => saveContact()}
        disabled={!valid || pendingSave}
      >
        {#if pendingSave}
          <SvgIcon icon="spinner" size="18" color={$modeCurrent ? "%232e2e2e" : "white"} />
        {/if}
        <strong class="ml-2">
          {#if agentPubKeyB64}{$t("common.save")}{:else}{$t("common.done")}{/if}
        </strong>
      </Button>
    </footer>
  {:else}
    <div class="flex flex-1 flex-col items-center">
      <div class="flex flex-row justify-center">
        <h1 class="mr-2 flex-shrink-0 text-3xl">{existingContactExtended?.fullName}</h1>

        <button on:click={() => (editing = true)}>
          <SvgIcon icon="write" size="24" color="gray" moreClasses="cursor-pointer" />
        </button>
      </div>
      <div class="mt-2 flex items-center justify-center">
        <span
          class="text-secondary-400 dark:text-tertiary-700 mr-1 w-64 overflow-hidden text-ellipsis text-nowrap"
        >
          {existingContactExtended?.agentPubKeyB64}
        </span>
        <button
          on:click={() =>
            existingContactExtended?.agentPubKeyB64 &&
            copyToClipboard(existingContactExtended?.agentPubKeyB64)}
        >
          <SvgIcon icon="copy" size="20" color="%23999" />
        </button>
        {#if isMobile()}
          <button
            on:click={() =>
              existingContactExtended && shareText(existingContactExtended?.agentPubKeyB64)}
          >
            <SvgIcon icon="share" size="20" color="%23999" />
          </button>
        {/if}
      </div>
    </div>

    <div
      class="bg-tertiary-500 dark:bg-secondary-500 mx-8 flex flex-col items-center rounded-xl p-4"
    >
      <SvgIcon icon="handshake" size="36" color={$modeCurrent ? "%23232323" : "white"} />
      <h1 class="text-secondary-500 dark:text-tertiary-100 mt-2 text-xl font-bold">
        {$t("contacts.pending_connection_header")}
      </h1>
      <p class="text-secondary-400 dark:text-tertiary-700 mb-6 mt-4 text-center text-sm">
        {$tAny("contacts.pending_connection_description", { name: firstName })}
      </p>
      <div class="flex justify-center">
        <Button
          moreClasses="bg-surface-100 text-sm text-secondary-500 dark:text-tertiary-100 font-bold dark:bg-secondary-900"
          on:click={() =>
            existingContactExtended &&
            contactsStore.copyPrivateConversationInviteCode(existingContactExtended.agentPubKeyB64)}
        >
          <SvgIcon icon="copy" size="20" color="%23FD3524" moreClasses="mr-2" />
          {$t("contacts.copy_invite_code")}
        </Button>
        {#if isMobile()}
          <Button
            moreClasses="bg-surface-100 text-sm text-secondary-500 dark:text-tertiary-100 font-bold dark:bg-secondary-900"
            on:click={() =>
              existingContactExtended &&
              contactsStore.sharePrivateConversationInviteCode(
                existingContactExtended.agentPubKeyB64,
              )}
          >
            <SvgIcon icon="copy" size="20" color="%23FD3524" moreClasses="mr-2" />
            <strong>{$t("contacts.share_invite_code")}</strong>
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>
