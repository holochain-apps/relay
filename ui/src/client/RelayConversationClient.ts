import { type AppClient, type CellId, type AgentPubKey, type ActionHash } from "@holochain/client";
import type { Config, MessageRecord, Message2 } from "../types";
import { ProfilesClient } from "$clients/ProfilesClient";
import type { Profile } from "@holochain-open-dev/profiles";

export class RelayConversationClient {
  constructor(
    public client: AppClient,
    public cellId: CellId,
  ) {}

  /**
   * Get all hashes from `bucket` if `count` does NOT match the number of hashes in the `bucket`
   * @param cellId
   * @param bucket
   * @param count
   * @returns
   */
  async getMessageHashes(bucket: number, count: number): Promise<ActionHash[]> {
    return this.client.callZome({
      cell_id: this.cellId,
      zome_name: "relay",
      fn_name: "get_message_hashes",
      payload: { bucket, count },
    });
  }

  /**
   * Get all message records of hashes
   * @param cellId
   * @param hashes
   * @returns
   */
  async getMessageEntries(hashes: ActionHash[]): Promise<MessageRecord[]> {
    return this.client.callZome({
      cell_id: this.cellId,
      zome_name: "relay",
      fn_name: "get_message_entries",
      payload: hashes,
    });
  }

  /**
   * Send a message to a list of recipients
   *
   * @param cellId
   * @param message
   * @param agents
   * @returns
   */
  async sendMessage(message: Message2, agents: AgentPubKey[]) {
    return await this.client.callZome({
      cell_id: this.cellId,
      zome_name: "relay",
      fn_name: "create_message",
      payload: {
        message,
        agents,
      },
    });
  }

  /**
   * Create a configuration for the conversation
   * @param cellId
   * @param config
   * @returns
   */
  async createConfig(config: Config): Promise<null> {
    return this.client.callZome({
      cell_id: this.cellId,
      zome_name: "relay",
      fn_name: "set_config",
      payload: config,
    });
  }

  /**
   * Get the latest Config for the conversation
   * @param cellId
   * @returns
   */
  async getConfig(): Promise<Config> {
    return await this.client.callZome({
      cell_id: this.cellId,
      zome_name: "relay",
      fn_name: "get_config",
      payload: null,
    });
  }

  /**
   * Create my Profile
   * @param profile
   */
  async createProfile(profile: Profile) {
    const clonedCellProfilesClient = new ProfilesClient(this.client, this.cellId);
    await clonedCellProfilesClient.create(profile);
  }
}
