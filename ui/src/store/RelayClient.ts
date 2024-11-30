import { v4 as uuidv4 } from "uuid";
import {
  CellType,
  decodeHashFromBase64,
  encodeHashToBase64,
  type AgentPubKey,
  type AppClient,
  type CellId,
  type CellInfo,
  type MembraneProof,
  type AgentPubKeyB64,
  type ActionHash,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { EntryRecord } from "@holochain-open-dev/utils";
import type { Profile, ProfilesStore } from "@holochain-open-dev/profiles";
import { get } from "svelte/store";
import type {
  Config,
  Contact,
  ConversationCellAndConfig,
  ImageStruct,
  Invitation,
  MembraneProofData,
  Message,
  MessageRecord,
  Privacy,
} from "../types";

export class RelayClient {
  // conversations is a map of string to ClonedCell
  conversations: { [key: string]: ConversationCellAndConfig } = {};
  myPubKeyB64: AgentPubKeyB64;

  constructor(
    public client: AppClient,
    public profilesStore: ProfilesStore,
    public roleName: string,
    public zomeName: string,
  ) {
    this.myPubKeyB64 = encodeHashToBase64(this.client.myPubKey);
  }

  get myPubKey(): AgentPubKey {
    return this.client.myPubKey;
  }

  async createProfile(firstName: string, lastName: string, avatar: string): Promise<Profile> {
    return this.client.callZome({
      role_name: this.roleName,
      zome_name: "profiles",
      fn_name: "create_profile",
      payload: { nickname: firstName + " " + lastName, fields: { avatar, firstName, lastName } },
    });
  }

  async updateProfile(firstName: string, lastName: string, avatar: string): Promise<Profile> {
    const profile = await this.client.callZome({
      role_name: this.roleName,
      zome_name: "profiles",
      fn_name: "update_profile",
      payload: { nickname: firstName + " " + lastName, fields: { avatar, firstName, lastName } },
    });

    // Update profile in every conversation I am a part of
    Object.values(this.conversations).forEach(async (conversation) => {
      await this.client.callZome({
        cell_id: conversation.cell.cell_id,
        zome_name: "profiles",
        fn_name: "update_profile",
        payload: { nickname: firstName + " " + lastName, fields: { avatar, firstName, lastName } },
      });
    });

    return profile;
  }

  /********* Conversations **********/
  async initConversations() {
    const appInfo = await this.client.appInfo();

    if (appInfo) {
      const cells: CellInfo[] = appInfo.cell_info[this.roleName].filter(
        (c) => CellType.Cloned in c,
      );

      for (const c of cells) {
        // @ts-ignore
        const cell = c[CellType.Cloned];

        try {
          const configRecord = await this._getConfig(cell.cell_id);

          const config = configRecord ? configRecord.entry : { title: cell.name, image: "" };

          const convoCellAndConfig: ConversationCellAndConfig = { cell, config };

          this.conversations[cell.dna_modifiers.network_seed] = convoCellAndConfig;
        } catch (e) {
          console.error("Unable to get config for cell:", cell, e);
        }
      }
    }
  }

  async createConversation(
    title: string,
    image: string,
    privacy: Privacy,
  ): Promise<ConversationCellAndConfig | null> {
    return this._cloneConversation(
      new Date().getTime(),
      title,
      image,
      privacy,
      this.client.myPubKey,
    );
  }

  async joinConversation(invitation: Invitation): Promise<ConversationCellAndConfig | null> {
    // we don't have the image at join time, it get's loaded later
    return this._cloneConversation(
      invitation.created,
      invitation.title,
      "",
      invitation.privacy,
      invitation.progenitor,
      invitation.proof,
      invitation.networkSeed,
    );
  }

  async _cloneConversation(
    created: number,
    title: string,
    image: string,
    privacy: Privacy,
    progenitor: AgentPubKey,
    membrane_proof?: MembraneProof,
    networkSeed?: string,
  ): Promise<ConversationCellAndConfig | null> {
    const conversationId = networkSeed || uuidv4();

    try {
      const cell = await this.client.createCloneCell({
        role_name: this.roleName,
        name: title,
        membrane_proof,
        modifiers: {
          network_seed: conversationId,
          properties: {
            created,
            privacy,
            progenitor: encodeHashToBase64(progenitor),
          },
        },
      });

      if (!networkSeed) {
        await this._setConfig({ title, image }, cell.cell_id);
      }

      await this._setMyProfileForConversation(cell.cell_id);
      const convoCellAndConfig: ConversationCellAndConfig = { cell, config: { title, image } };
      this.conversations[conversationId] = convoCellAndConfig;
      return convoCellAndConfig;
    } catch (e) {
      console.error("Error creating conversation", e);
      return null;
    }
  }

  public async getAllMessages(
    conversationId: string,
    buckets: Array<number>,
  ): Promise<Array<MessageRecord>> {
    return this.client.callZome({
      cell_id: this.conversations[conversationId].cell.cell_id,
      zome_name: this.zomeName,
      fn_name: "get_messages_for_buckets",
      payload: buckets,
    });
  }

  public async getMessageHashes(
    conversationId: string,
    bucket: number,
    count: number,
  ): Promise<Array<ActionHash>> {
    return this.client.callZome({
      cell_id: this.conversations[conversationId].cell.cell_id,
      zome_name: this.zomeName,
      fn_name: "get_message_hashes",
      payload: { bucket, count },
    });
  }

  public async getMessageEntries(
    conversationId: string,
    hashes: Array<ActionHash>,
  ): Promise<Array<MessageRecord>> {
    return this.client.callZome({
      cell_id: this.conversations[conversationId].cell.cell_id,
      zome_name: this.zomeName,
      fn_name: "get_message_entries",
      payload: hashes,
    });
  }

  public async getAllAgents(conversationId: string): Promise<{ [key: AgentPubKeyB64]: Profile }> {
    const cellId = this.conversations[conversationId].cell.cell_id;

    const agentsResponse = await this.client.callZome({
      cell_id: cellId,
      zome_name: "profiles",
      fn_name: "get_agents_with_profile",
      payload: null,
    });

    return await agentsResponse.reduce(
      async (resultsPromise: { [key: AgentPubKeyB64]: Profile }, a: any) => {
        const agentRecord = await this.client.callZome({
          cell_id: cellId,
          zome_name: "profiles",
          fn_name: "get_agent_profile",
          payload: a,
        });
        const results = await resultsPromise;

        if (!!agentRecord?.entry?.Present?.entry) {
          results[encodeHashToBase64(a)] = decode(agentRecord.entry.Present.entry) as Profile;
        }

        return results;
      },
      Promise.resolve<{ [key: AgentPubKeyB64]: Profile }>({}),
    );
  }

  async _setConfig(config: Config, cellId: CellId): Promise<null> {
    return this.client.callZome({
      cell_id: cellId,
      zome_name: this.zomeName,
      fn_name: "set_config",
      payload: config,
    });
  }

  async _getConfig(id: CellId | string): Promise<EntryRecord<Config> | undefined> {
    const cellId = typeof id === "string" ? this.conversations[id].cell.cell_id : id;

    const config = await this.client.callZome({
      cell_id: cellId,
      zome_name: this.zomeName,
      fn_name: "get_config",
      payload: null,
    });
    return config ? new EntryRecord(config) : undefined;
  }

  public async sendMessage(
    conversationId: string,
    content: string,
    bucket: number,
    images: ImageStruct[],
    agents: AgentPubKey[],
  ): Promise<EntryRecord<Message>> {
    const message = await this.client.callZome({
      cell_id: this.conversations[conversationId].cell.cell_id,
      zome_name: this.zomeName,
      fn_name: "create_message",
      payload: {
        message: { content, bucket, images },
        agents,
      },
    });
    return new EntryRecord(message);
  }

  async _setMyProfileForConversation(cellId: CellId): Promise<null> {
    const myProfile = get(this.profilesStore.myProfile);
    const myProfileValue =
      myProfile && myProfile.status === "complete" && (myProfile.value as EntryRecord<Profile>);
    const profile = myProfileValue ? myProfileValue.entry : undefined;

    return this.client.callZome({
      cell_id: cellId,
      zome_name: "profiles",
      fn_name: "create_profile",
      payload: profile,
    });
  }

  public async generateMembraneProofForAgent(
    conversationId: string,
    forAgent: AgentPubKey,
    role: number = 0,
  ): Promise<MembraneProof | undefined> {
    const conversation = this.conversations[conversationId];

    const membraneProof = await this.client.callZome({
      cell_id: conversation.cell.cell_id,
      zome_name: "profiles",
      fn_name: "generate_membrane_proof",
      payload: {
        conversation_id: conversation.cell.dna_modifiers.network_seed,
        for_agent: forAgent,
        as_role: role,
      } as MembraneProofData,
    });

    return membraneProof;
  }

  /********* Contacts **********/

  public async getAllContacts() {
    return this.client.callZome({
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name: "get_all_contact_entries",
      payload: null,
    });
  }

  public async createContact(contact: Contact) {
    return this.client.callZome({
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name: "create_contact",
      payload: {
        avatar: contact.avatar,
        first_name: contact.firstName,
        last_name: contact.lastName,
        public_key: decodeHashFromBase64(contact.publicKeyB64),
      },
    });
  }

  public async updateContact(contact: Contact) {
    return this.client.callZome({
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name: "update_contact",
      payload: {
        original_contact_hash: contact.originalActionHash,
        previous_contact_hash: contact.currentActionHash,
        updated_contact: {
          avatar: contact.avatar,
          first_name: contact.firstName,
          last_name: contact.lastName,
          public_key: decodeHashFromBase64(contact.publicKeyB64),
        },
      },
    });
  }
}
