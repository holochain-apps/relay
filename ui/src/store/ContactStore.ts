import { type ActionHash, type AgentPubKeyB64 } from "@holochain/client";
import { writable, get, type Writable } from "svelte/store";
import { RelayStore } from "$store/RelayStore";
import { type Contact } from "../types";
import { persisted, type Persisted } from "@square/svelte-store";

export class ContactStore {
  private contact: Writable<Contact>;
  private privateConversationId: Persisted<string | undefined>;

  constructor(
    public relayStore: RelayStore,
    public avatar: string,
    public currentActionHash: ActionHash | undefined,
    public firstName: string,
    public lastName: string,
    public originalActionHash: ActionHash | undefined,
    public publicKeyB64: AgentPubKeyB64,
    public conversationId?: string,
  ) {
    this.privateConversationId = persisted<string | undefined>(
      conversationId,
      `CONTACTS.${publicKeyB64}.PRIVATE_CONVERSATION_ID`,
    );
    this.contact = writable({
      avatar,
      confirmed: false,
      currentActionHash,
      firstName,
      lastName,
      originalActionHash,
      publicKeyB64,
      privateConversationId: get(this.privateConversationId),
    });
  }

  subscribe(run: any) {
    return this.contact.subscribe(run);
  }

  get data() {
    return get(this.contact);
  }

  get name() {
    return this.data.firstName + " " + this.data.lastName;
  }

  get privateConversation() {
    return this.data.privateConversationId
      ? this.relayStore.getConversation(this.data.privateConversationId)
      : null;
  }

  // Check if the contact has joined the private conversation between you yet
  get pendingConnection() {
    const conversationAgents =
      this.data.privateConversationId &&
      this.relayStore.getConversation(this.data.privateConversationId)?.data.agentProfiles;
    return conversationAgents && Object.keys(conversationAgents).length === 1;
  }

  update(newData: any) {
    this.contact.update((c) => {
      return { ...c, ...newData };
    });
  }
}
