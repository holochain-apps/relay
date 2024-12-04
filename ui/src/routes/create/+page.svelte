<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { getContext } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import Avatar from "$lib/Avatar.svelte";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { ConversationStore } from "$store/ConversationStore";
  import { RelayStore } from "$store/RelayStore";
  import { type ContactExtended, Privacy } from "../../types";
  import type { AllContactsStore } from "$store/AllContactsStore";
  import type { AgentPubKeyB64 } from "@holochain/client";

  const relayStoreContext: { getStore: () => RelayStore } = getContext("relayStore");
  let relayStore = relayStoreContext.getStore();

  const contactsStoreContext: { getStore: () => AllContactsStore } = getContext("contactsStore");
  let contactsStore = contactsStoreContext.getStore();

  let selectedContacts: AgentPubKeyB64[] = [];
  let search = "";
  let existingConversation: ConversationStore | undefined = undefined;
  let pendingCreate = false;

  const tAny = t as any;

  /**
   * Existing conversation with all selected contacts
   */
  $: existingConversation =
    selectedContacts.length > 0
      ? $relayStore
          .sort((a, b) =>
            b.privacy === Privacy.Private ? 1 : a.privacy === Privacy.Private ? -1 : 0,
          )
          .find(
            (c) =>
              c.allMembers.length === selectedContacts.length &&
              c.allMembers.every((k) => selectedContacts.find((c) => c === k.publicKeyB64)),
          )
      : undefined;

  /**
   * Search contacts by name or public key
   */
  $: searchNormalized = search.trim().toLowerCase();
  $: contacts = Object.values($contactsStore)
    .filter(
      (c: ContactExtended) =>
        c.fullName.toLowerCase().includes(searchNormalized) ||
        (searchNormalized.length > 2 && c.agentPubKeyB64.toLowerCase().includes(searchNormalized)),
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  function toggleSelectContact(publicKey: string) {
    console.log(selectedContacts, publicKey);
    if (selectedContacts.includes(publicKey)) {
      selectedContacts = selectedContacts.filter((v) => v !== publicKey);
    } else {
      selectedContacts = [...selectedContacts, publicKey];
    }
  }

  async function createConversation() {
    if (existingConversation) {
      goto(`/conversations/${existingConversation.id}`);
      return;
    }

    pendingCreate = true;

    const selectedContactExtended = selectedContacts.map((s) => get(contactsStore.contacts)[s]);

    let title;
    if (selectedContactExtended.length === 1) {
      title = selectedContactExtended[0].fullName;
    } else if (selectedContactExtended.length === 2) {
      title = selectedContactExtended.map((c) => c.contact.first_name).join(" & ");
    } else {
      title = selectedContactExtended.map((c) => c.contact.first_name).join(", ");
    }

    const conversation = await relayStore.createConversation(
      title,
      "",
      Privacy.Private,
      selectedContacts,
    );
    if (conversation) {
      goto(`/conversations/${conversation.id}/details`);
    }
    pendingCreate = false;
  }
</script>

<Header>
  <button class="absolute z-10 pr-5 text-4xl" on:click={() => goto("/welcome")}>
    <SvgIcon icon="caretLeft" color={$modeCurrent ? "%232e2e2e" : "white"} size="10" />
  </button>

  <h1 class="flex-1 text-center">{$t("create.page_title")}</h1>
</Header>

<div
  class="text-secondary-500 container relative mx-auto flex w-full flex-1 flex-col items-center p-5"
>
  <div class="relative my-5 w-full">
    <input
      type="text"
      class="text-md !bg-tertiary-500 dark:!bg-secondary-500 dark:text-tertiary-500 h-12 w-full rounded-full border-0 pl-10 pr-4"
      placeholder={$t("create.search_placeholder")}
      bind:value={search}
    />
    <SvgIcon
      icon="search"
      size="24"
      color={$modeCurrent ? "%232e2e2e" : "%23ccc"}
      moreClasses="absolute top-3 left-3"
    />
  </div>

  <div class="mb-5 flex w-full justify-between gap-4">
    <button
      class="bg-tertiary-500 dark:bg-secondary-500 dark:text-tertiary-400 flex h-24 w-28 flex-col items-center rounded-2xl py-2 text-xs disabled:opacity-50"
      on:click={() => goto("/conversations/join")}
    >
      <SvgIcon
        icon="ticket"
        size="32"
        color={$modeCurrent ? "%232e2e2e" : "white"}
        moreClasses="flex-grow"
      />
      <p class="">{$t("common.use_invite_code")}</p>
    </button>

    <button
      class="bg-tertiary-500 dark:bg-secondary-500 dark:text-tertiary-400 flex h-24 w-28 flex-col items-center rounded-2xl py-2 text-xs disabled:opacity-50"
      on:click={() => goto("/contacts/new")}
    >
      <SvgIcon
        icon="newPerson"
        size="32"
        color={$modeCurrent ? "%232e2e2e" : "white"}
        moreClasses="flex-grow"
      />
      <p>{$t("common.new_contact")}</p>
    </button>

    <button
      class="bg-tertiary-500 dark:bg-secondary-500 dark:text-tertiary-400 flex h-24 w-28 flex-col items-center rounded-2xl py-2 text-xs disabled:opacity-50"
      on:click={() => goto("/conversations/new")}
    >
      <SvgIcon
        icon="people"
        size="32"
        color={$modeCurrent ? "%232e2e2e" : "white"}
        moreClasses="flex-grow"
      />
      <p>{$t("common.new_group")}</p>
    </button>
  </div>

  {#if contacts.length === 0}
    <img
      src={$modeCurrent ? "/clear-skies-gray.png" : "/clear-skies-white.png"}
      alt="No contacts"
      class="mb-4 mt-10 h-32 w-32"
    />
    <h2 class="text-secondary-500 dark:text-tertiary-500 mb-1 text-lg font-bold">
      {$t("create.no_contacts_header")}
    </h2>
    <p class="text-secondary-400 dark:text-tertiary-700 text-center text-xs">
      {$t("create.no_contacts_text")}
    </p>
  {:else}
    <div class="w-full">
      {#each contacts as contactExtended, i}
        {#if i === 0 || contactExtended.contact.first_name
            .charAt(0)
            .toUpperCase() !== contacts[i - 1].contact.first_name.charAt(0).toUpperCase()}
          <p class="text-secondary-300 mb-1 mt-2 pl-0">
            {contactExtended.contact.first_name[0].toUpperCase()}
          </p>
        {/if}
        {@const selected = selectedContacts.find((c) => c === contactExtended.agentPubKeyB64)}
        <button
          class="-ml-1 mb-2 flex w-full items-center justify-between rounded-3xl py-1 pl-1 pr-2 {selected &&
            'bg-tertiary-500 dark:bg-secondary-500'}"
          on:click={() => toggleSelectContact(contactExtended.agentPubKeyB64)}
        >
          <Avatar
            size={38}
            image={contactExtended.contact.avatar}
            agentPubKey={contactExtended.contact.public_key}
            moreClasses="mr-3"
          />
          <p class="dark:text-tertiary-100 flex-1 text-start font-bold">
            {contactExtended.fullName}
          </p>
          {#if selected}
            <button
              class="text-secondary-700 flex h-8 items-center justify-center rounded-full bg-white px-2 font-bold"
              on:click={() => goto("/contacts/" + contactExtended.agentPubKeyB64)}
            >
              <span class="mx-2 text-xs">{$t("create.view")}</span>
            </button>
          {:else}
            <span class="text-primary-500 text-lg font-extrabold">+</span>
          {/if}
        </button>
      {/each}
    </div>

    {#if selectedContacts.length > 0}
      <button
        class="max-w-2/3 bg-primary-500 fixed bottom-5 right-5 flex items-center justify-center rounded-full border-0 py-1 pl-2 pr-4 text-white"
        disabled={pendingCreate}
        on:click={() => createConversation()}
      >
        <span
          class="bg-surface-500 text-primary-500 mr-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
        >
          <SvgIcon
            icon={pendingCreate ? "spinner" : "person"}
            size="12"
            color="%23FD3524"
            moreClasses="mr-1"
          />
          {selectedContacts.length}
        </span>
        <div class="nowrap overflow-hidden text-ellipsis">
          <div class="text-md text-start">
            {$tAny("create.open_conversation", { existingConversation: !!existingConversation })}
          </div>
          <div class="pb-1 text-start text-xs font-light">
            with {selectedContacts.map((c) => $contactsStore[c].contact.first_name).join(", ")}
          </div>
        </div>
      </button>
    {/if}
  {/if}
</div>
