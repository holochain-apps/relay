import { type AppClient, type CellId, type AgentPubKey, type ClonedCell } from "@holochain/client";
import type { Contact, Invitation, Privacy } from "../types";
import { v4 as uuidv4 } from "uuid";
import { ProfilesClient } from "$clients/ProfilesClient";
import { RelayConversationClient } from "./RelayConversationClient";

/**
 * Client for the *original* provisioned relay cell
 *
 * This is where all contacts are stored,
 * and where the *conversation* cloned relay cells are cloned from.
 */
export class RelayOriginalClient {
  constructor(
    public client: AppClient,
    public myPubKey: AgentPubKey,
  ) {}

  /**
   * Get all contacts
   * @returns
   */
  async getAllContacts() {
    return await this.client.callZome({
      fn_name: "get_all_contacts",
      role_name: "relay",
      zome_name: "relay",
      payload: null,
    });
  }

  /**
   * Create a contact
   * @returns
   */
  async createContact(contact: Contact) {
    return await this.client.callZome({
      role_name: "relay",
      zome_name: "relay",
      fn_name: "create_contact",
      payload: contact,
    });
  }

  /**
   * Update a contact
   *
   * Contacts are all stored in the *original* provisioned relay cell
   * @returns
   */
  async updateContact(contact: Contact) {
    return await this.client.callZome({
      role_name: "relay",
      zome_name: "relay",
      fn_name: "update_contact",
      payload: contact,
    });
  }

  /**
   * Create a conversation.
   *
   * This clones the relay cell to create a new network for the conversation.
   *
   * @param title
   * @param image
   * @param privacy
   */
  async createConversation(title: string, image: string, privacy: Privacy) {
    const clonedCell: ClonedCell = await this.client.createCloneCell({
      role_name: "relay",
      modifiers: {
        network_seed: uuidv4(),
        properties: {
          created: new Date().getTime(),
          progenitor: this.myPubKey,
          privacy,
        },
      },
    });

    // Publish my Profile to newly cloned cell
    await this.copyProfileToConversation(clonedCell.cell_id);

    // Create Config in newly cloned cell
    const clonedCellClient = new RelayConversationClient(this.client, clonedCell.cell_id);
    await clonedCellClient.createConfig({ title, image });
  }

  /**
   * Create a conversation.
   *
   * This clones the relay cell with the parameters specified in the invitation to join the existing conversation.
   *
   * @param title
   * @param image
   * @param privacy
   */
  async joinConversation(invitation: Invitation) {
    const clonedCell: ClonedCell = await this.client.createCloneCell({
      role_name: "relay",
      modifiers: {
        network_seed: invitation.networkSeed,
        properties: {
          created: invitation.created,
          progenitor: invitation.progenitor,
          privacy: invitation.privacy,
        },
      },
    });

    // Publish my Profile to newly cloned cell
    await this.copyProfileToConversation(clonedCell.cell_id);
  }

  /**
   * Get my Profile from the original relay cell, then create my Profile with the same data in the specified cell
   * @param cellId
   */
  private async copyProfileToConversation(cellId: CellId) {
    // Get my current Profile
    const originalCellProfilesClient = new ProfilesClient(this.client, undefined, "relay");
    const profile = await originalCellProfilesClient.getAgentProfile(this.myPubKey);

    // Publish my Profile to newly cloned cell
    const clonedCellClient = new RelayConversationClient(this.client, cellId);
    await clonedCellClient.createProfile(profile);
  }
}
