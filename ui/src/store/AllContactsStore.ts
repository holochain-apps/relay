import {
  decodeHashFromBase64,
  encodeHashToBase64,
  type ActionHash,
  type AgentPubKeyB64,
  type ClonedCell,
} from "@holochain/client";
import { writable, get, type Writable, type Subscriber, type Unsubscriber } from "svelte/store";
import { Privacy, type Contact2, type ContactExtended } from "../types";
import type { RelayClient } from "./RelayClient";
import { copyToClipboard } from "$lib/utils";
import { shareText } from "@buildyourwebapp/tauri-plugin-sharesheet";
import type { RelayStore } from "./RelayStore";

export class AllContactsStore {
  public contacts: Writable<{ [agentPubKeyB64: AgentPubKeyB64]: ContactExtended }> = writable({});

  constructor(private client: RelayClient) {}

  subscribe(
    run: Subscriber<{
      [agentPubKeyB64: string]: ContactExtended;
    }>,
  ): Unsubscriber {
    return this.contacts.subscribe(run);
  }

  /**
   * Fetches all contacts, initializes ContactStore for each, adds them to the `this.contacts` obj
   *
   * @async
   */
  async initialize() {
    const appInfo = await this.client.client.appInfo();
    if (!appInfo) throw new Error("AppInfo is empty");

    // Fetch contacts
    const contactRecords = await this.client.getAllContacts();

    // Construct obj of AgentPubKeyB64 -> ContactStore for that agent]
    const allContactEntries = await Promise.all(
      contactRecords
        // Only include records for which we have Contact data
        .filter((c) => c.contact !== undefined)

        // Create array of [key, value] for use with Object.fromEntries
        .map(async (c) => {
          const agentPubKeyB64 = encodeHashToBase64(c.contact!.public_key);
          let cellInfo = await this.client.findClonedRelayCellInfoByName(appInfo, agentPubKeyB64);

          return [
            agentPubKeyB64,
            this.makeContactExtended(
              c.contact!,
              cellInfo!,
              c.original_action,
              c.signed_action.hashed.hash,
            ),
          ];
        }),
    );

    console.log("allContactEntries", allContactEntries);
    // Set the contacts writable
    this.contacts.set(Object.fromEntries(allContactEntries));
  }

  /**
   * Creates a contact and setup a private conversation with them
   *
   * @async
   * @param contact
   * @returns
   */
  async create(contact: Contact2): Promise<AgentPubKeyB64> {
    const appInfo = await this.client.client.appInfo();
    if (!appInfo) throw new Error("AppInfo is empty");
    const agentPubKeyB64 = encodeHashToBase64(contact.public_key);

    // Check if you already have a 1-1 conversation with this contact
    let cellInfo = await this.client.findClonedRelayCellInfoByName(appInfo, agentPubKeyB64);

    // Create a 1-1 conversation if needed
    if (!cellInfo) {
      const cell = await this.client.createConversation(agentPubKeyB64, "", Privacy.Private);
      cellInfo = cell.cell;
    }

    // Create the contact
    const record = await this.client.createContact(contact);

    // Update the contacts writable
    console.log("create contact", contact);
    this.contacts.update((c) => {
      return {
        ...c,
        [agentPubKeyB64]: this.makeContactExtended(
          contact,
          cellInfo,
          record.signed_action.hashed.hash,
          record.signed_action.hashed.hash,
        ),
      };
    });
    console.log("created contact", get(this.contacts));

    return agentPubKeyB64;
  }

  /**
   * Update a contact
   *
   * @async
   * @param contact
   * @returns
   */
  async update(contact: Contact2): Promise<AgentPubKeyB64> {
    const agentPubKeyB64 = encodeHashToBase64(contact.public_key);

    // Update the Contact
    const currentContact = get(this.contacts)[agentPubKeyB64];
    const record = await this.client.updateContact({
      original_contact_hash: currentContact.originalActionHash,
      previous_contact_hash: currentContact.latestActionHash,
      updated_contact: contact,
    });

    // Update the contacts writable
    this.contacts.update((c) => ({
      ...c,
      [agentPubKeyB64]: {
        ...c[agentPubKeyB64],
        latest_action_hash: record.signed_action.hashed.hash,
        contact,
      },
    }));

    return agentPubKeyB64;
  }

  private async getPrivateConversationInviteCode(agentPubKeyB64: AgentPubKeyB64): Promise<string> {
    const cellInfo = get(this.contacts)[agentPubKeyB64].privateConversationCellInfo;
    const inviteCode = await this.client.generateMembraneProofForAgent(
      cellInfo,
      decodeHashFromBase64(agentPubKeyB64),
    );

    return encodeHashToBase64(inviteCode);
  }

  async copyPrivateConversationInviteCode(agentPubKeyB64: AgentPubKeyB64) {
    const inviteCode = await this.getPrivateConversationInviteCode(agentPubKeyB64);
    await copyToClipboard(inviteCode);
  }

  async sharePrivateConversationInviteCode(agentPubKeyB64: AgentPubKeyB64) {
    const inviteCode = await this.getPrivateConversationInviteCode(agentPubKeyB64);
    await shareText(inviteCode);
  }

  private makeContactExtended(
    contact: Contact2,
    privateConversationCellInfo: ClonedCell,
    originalActionHash: ActionHash,
    latestActionHash: ActionHash,
  ): ContactExtended {
    return {
      originalActionHash,
      latestActionHash,
      contact,
      privateConversationCellInfo,
      privateConversationId: encodeHashToBase64(privateConversationCellInfo.cell_id[0]),
      fullName: this.makeFullName(contact),
      agentPubKeyB64: encodeHashToBase64(contact.public_key),
    };
  }

  private makeFullName(contact: Contact2) {
    return `${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`;
  }
}
