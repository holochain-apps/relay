import { v4 as uuidv4 } from 'uuid';
import {
  CellType,
  decodeHashFromBase64,
  encodeHashToBase64,
  type AgentPubKey,
  type AppClient,
  type AppCreateCloneCellRequest,
  type AppCallZomeRequest,
  type CellId,
  type CellInfo,
  type RoleName,
  type MembraneProof,
  type AgentPubKeyB64,
  type ActionHash
} from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import type { Profile, ProfilesStore } from '@holochain-open-dev/profiles'
import { get } from 'svelte/store';
import type { Config, Contact, ConversationCellAndConfig, ImageStruct, Invitation, MembraneProofData, Message, MessageRecord, Privacy, Properties } from '../types';

const ZOME_NAME = 'relay'

export class RelayClient {
  // conversations is a map of string to ClonedCell
  conversations: {[key: string]: ConversationCellAndConfig} = {}
  zomeName = ZOME_NAME
  myPubKeyB64: AgentPubKeyB64

  constructor(public client: AppClient, public roleName: RoleName, public profilesStore: ProfilesStore) {
    this.myPubKeyB64 = encodeHashToBase64(this.client.myPubKey)
  }

  get myPubKey() : AgentPubKey {
    return this.client.myPubKey
  }

  async createProfile(firstName: string, lastName: string, avatar: string) : Promise<Profile> {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      zome_name: 'profiles',
      fn_name: 'create_profile',
      payload: { nickname: firstName + ' ' + lastName, fields: { avatar, firstName, lastName } }
    };
    const profile = await this.client.callZome(req, 60000);
    return profile
  }

  async updateProfile(firstName: string, lastName: string, avatar: string) : Promise<Profile> {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      zome_name: 'profiles',
      fn_name: 'update_profile',
      payload: { nickname: firstName + ' ' + lastName, fields: { avatar, firstName, lastName } }
    };
    const profile = await this.client.callZome(req, 60000);

    // Update profile in every conversation I am a part of
    Object.values(this.conversations).forEach(async (conversation) => {
      const req: AppCallZomeRequest = {
        cell_id: conversation.cell.cell_id,
        zome_name: 'profiles',
        fn_name: 'update_profile',
        payload: { nickname: firstName + ' ' + lastName, fields: { avatar, firstName, lastName } }
      };
      await this.client.callZome(req, 60000);
    })

    return profile
  }

  /********* Conversations **********/
  async initConversations() {
    const appInfo = await this.client.appInfo()

    if (appInfo) {
      const cells: CellInfo[] = appInfo.cell_info[this.roleName].filter(
        (c) => CellType.Cloned in c
      );

      for (const c of cells) {
        // @ts-ignore
        const cell = c[CellType.Cloned]

        try {
          const configRecord = await this._getConfig(cell.cell_id)

          const config = configRecord? configRecord.entry : { title: cell.name, image: "" }

          const convoCellAndConfig: ConversationCellAndConfig = { cell, config }

          this.conversations[cell.dna_modifiers.network_seed] = convoCellAndConfig
        } catch(e) {
          console.error("Unable to get config for cell:", cell, e)
        }
      }
    }
  }

  async createConversation(title: string, image: string, privacy: Privacy) : Promise<ConversationCellAndConfig | null> {
    return this._createConversation(new Date().getTime(), title, image, privacy, this.client.myPubKey, undefined, undefined)
  }

  async joinConversation(invitation: Invitation) : Promise<ConversationCellAndConfig | null> {
    // we don't have the image at join time, it get's loaded later
    return this._createConversation(invitation.created, invitation.title, "", invitation.privacy, invitation.progenitor, invitation.proof, invitation.networkSeed)
  }

  async _createConversation(created: number, title: string, image: string, privacy: Privacy, progenitor: AgentPubKey, membrane_proof: MembraneProof|undefined, networkSeed: string|undefined) : Promise<ConversationCellAndConfig | null> {
    const conversationId = networkSeed || uuidv4()

    const properties: Properties = {
      created,
      privacy,
      progenitor: encodeHashToBase64(progenitor),
    }

    const cloneReq : AppCreateCloneCellRequest = {
      role_name: this.roleName,
      name: title,
      membrane_proof,
      modifiers: {
        network_seed: conversationId,
        properties
      },
    }

    try {
      const cell = await this.client.createCloneCell(cloneReq)
      let config: Config = { title, image }
      if (!networkSeed) {
        await this._setConfig(config, cell.cell_id)
      }

      await this.setMyProfileForConversation(cell.cell_id)
      const convoCellAndConfig: ConversationCellAndConfig = {cell, config}
      this.conversations[conversationId] = convoCellAndConfig
      return convoCellAndConfig
    } catch(e) {
      console.error("Error creating conversation", e)
      return null
    }
  }

  public async getAllMessages(conversationId: string, buckets: Array<number>) : Promise<Array<MessageRecord>> {
    const messages = await this.callZomeForCell("get_messages_for_buckets", buckets, this.conversations[conversationId].cell.cell_id);
    return messages
  }

  public async getMessageHashes(conversationId: string, bucket: number, count: number) : Promise<Array<ActionHash>> {
    const hashes = await this.callZomeForCell("get_message_hashes", {bucket, count}, this.conversations[conversationId].cell.cell_id);
    return hashes
  }

  public async getMessageEntries(conversationId: string, hashes: Array<ActionHash>) : Promise<Array<MessageRecord>> {
    const messages = await this.callZomeForCell("get_message_entries", hashes, this.conversations[conversationId].cell.cell_id);
    return messages
  }

  public async getAllAgents(conversationId: string) : Promise<{ [key: AgentPubKeyB64]: Profile }> {
    const cellId = this.conversations[conversationId].cell.cell_id;

    const req: AppCallZomeRequest = {
      cell_id: cellId,
      zome_name: 'profiles',
      fn_name: 'get_agents_with_profile',
      payload: null,
    };
    const agentsResponse = await this.client.callZome(req, 60000);

    return await agentsResponse.reduce(async (resultsPromise: { [key: AgentPubKeyB64]: Profile }, a: any) => {
        const agentRecord = await this.client.callZome({
          cell_id: cellId,
          zome_name: 'profiles',
          fn_name: 'get_agent_profile',
          payload: a
        }, 60000);
        const results = await resultsPromise;
        results[encodeHashToBase64(a)] = decode(agentRecord.entry.Present.entry) as Profile
        return results
      }, Promise.resolve<{ [key: AgentPubKeyB64]: Profile }>({})
    )
  }

  async _setConfig(config: Config, cellId: CellId) : Promise<null> {
    return this.callZomeForCell(
      'set_config',
      config,
      cellId
    )
  }

  async _getConfig(id: CellId | string) : Promise<EntryRecord<Config>|undefined> {
    const cellId = typeof id === 'string' ? this.conversations[id].cell.cell_id : id;

    const config = await this.callZomeForCell(
      'get_config',
      null,
      cellId
    )
    return config ? new EntryRecord(config) : undefined
  }

  public async sendMessage(conversationId: string, content: string, bucket: number, images: ImageStruct[], agents: AgentPubKey[]): Promise<EntryRecord<Message>> {
    const message = await this.callZomeForCell(
      'create_message',
      {
        message: { content, bucket, images },
        agents
      },
      this.conversations[conversationId].cell.cell_id
    )
    return new EntryRecord(message)
  }

  public async setMyProfileForConversation(cellId: CellId) : Promise<null> {
    const myProfile = get(this.profilesStore.myProfile)
    const myProfileValue = myProfile && myProfile.status === 'complete' && myProfile.value as EntryRecord<Profile>
    const profile = myProfileValue ? myProfileValue.entry : undefined

    const req: AppCallZomeRequest = {
      //role_name: cell_id ? undefined : this.roleName,
      cell_id: cellId,
      zome_name: 'profiles',
      fn_name: 'create_profile',
      payload: profile,
    };
    return await this.client.callZome(req, 60000);
  }

  public async inviteAgentToConversation(conversationId: string, forAgent: AgentPubKey, role: number = 0): Promise<MembraneProof | undefined> {
    try {
      const conversation = this.conversations[conversationId]

      const data: MembraneProofData = {
        conversation_id: conversation.cell.dna_modifiers.network_seed,
        for_agent: forAgent,
        as_role: role,
      }

      const r = await this.callZomeForCell("generate_membrane_proof", data, conversation.cell.cell_id);
      return r
    } catch(e) {
      console.error("Error generating membrane proof", e)
    }
    return undefined
  }

  /********* Contacts **********/

  public async getAllContacts() {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      zome_name: this.zomeName,
      fn_name: 'get_all_contact_entries',
      payload: null
    }
    const result = await this.client.callZome(req, 60000)
    return result
  }

  public async createContact(contact: Contact) {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      zome_name: this.zomeName,
      fn_name: 'create_contact',
      payload: {
        avatar: contact.avatar,
        first_name: contact.firstName,
        last_name: contact.lastName,
        public_key: decodeHashFromBase64(contact.publicKeyB64)
      }
    }
    const result = await this.client.callZome(req, 60000)
    return result
  }

  public async updateContact(contact: Contact) {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      zome_name: this.zomeName,
      fn_name: 'update_contact',
      payload: {
        original_contact_hash: contact.originalActionHash,
        previous_contact_hash: contact.currentActionHash,
        updated_contact: {
          avatar: contact.avatar,
          first_name: contact.firstName,
          last_name: contact.lastName,
          public_key: decodeHashFromBase64(contact.publicKeyB64)
        }
      }
    }
    const result = await this.client.callZome(req, 60000)
    return result
  }

  /********* Util **********/
  protected async callZomeForCell(fn_name: string, payload: any, cell_id: any) {
    console.log("Call Zome", fn_name, payload, cell_id)
    const req: AppCallZomeRequest = {
      //role_name: cell_id ? undefined : this.roleName,
      cell_id,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return await this.client.callZome(req, 60000);
  }
}