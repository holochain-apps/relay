import { v4 as uuidv4 } from 'uuid';
import {
  CellType,
  encodeHashToBase64,
  type AgentPubKey,
  type AppClient,
  type AppCreateCloneCellRequest,
  type AppCallZomeRequest,
  type CellId,
  type CellInfo,
  type ClonedCell,
  type RoleName,
  type MembraneProof,
  type AgentPubKeyB64
} from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import type { ActionCommittedSignal } from '@holochain-open-dev/utils';
import type { Profile, ProfilesStore } from '@holochain-open-dev/profiles'
import { get } from 'svelte/store';
import type { Config, ConversationCellAndConfig, EntryTypes, MembraneProofData, MessageRecord, Properties } from '../types';
import { encode } from 'punycode';

const ZOME_NAME = 'relay'

// export type SignalMessage = {
//   payload: Payload;
//   from: AgentPubKey;
//   received: number;
// }

export type RelaySignal = ActionCommittedSignal<EntryTypes, any>;

//export class RelayClient extends ZomeClient<RelaySignal> {
export class RelayClient {
  // conversations is a map of string to ClonedCell
  conversations: {[key: string]: ConversationCellAndConfig} = {}
  zomeName = ZOME_NAME
  myPubKeyB64: AgentPubKeyB64

  constructor(public client: AppClient, public roleName: RoleName, public profilesStore: ProfilesStore) {
    //super(client, roleName, zomeName);
    this.myPubKeyB64 = encodeHashToBase64(this.client.myPubKey)
  }

  get myPubKey() : AgentPubKey {
    return this.client.myPubKey
  }

  async initConversations() {
    const appInfo = await this.client.appInfo()
    console.log("appInfo", appInfo)

    if (appInfo) {
      // appInfo.cell_info.modifiers

      const cells: CellInfo[] = appInfo.cell_info[this.roleName].filter(
        (c) => CellType.Cloned in c
      );

      for (const c of cells) {
        // @ts-ignore
        const cell = c[CellType.Cloned]

        try {
          const configEntry = await this._getConfig(cell.cell_id)

          const config = configEntry? configEntry.entry : {title: cell.name, image: ""}

          const convoCellAndConfig: ConversationCellAndConfig = {cell, config}
          console.log("FISH", convoCellAndConfig)

          this.conversations[cell.dna_modifiers.network_seed] = convoCellAndConfig
        } catch(e) {
          console.log("Unable to get config for cell:", cell, e)
        }
      }
    }
  }

  async createProfile(nickname: string, avatar: string) : Promise<Profile> {
    const req: AppCallZomeRequest = {
      role_name: 'relay',
      // cell_id: this.conversations[conversationId].cell_id,
      zome_name: 'profiles',
      fn_name: 'create_profile',
      payload: { nickname, fields: { avatar } }
    };
    const profile = await this.client.callZome(req, 30000);
    return profile
  }

  async createConversation(name: string, image: string) : Promise<ConversationCellAndConfig> {
    return this._createConversation(name, image, this.client.myPubKey, undefined, undefined)
  }

  async joinConversation(name: string, progenitor: AgentPubKey, proof: MembraneProof|undefined, networkSeed: string) : Promise<ConversationCellAndConfig> {
    // we don't have the image at join time, it get's loaded later
    return this._createConversation(name, "", progenitor, proof, networkSeed)
  }

  async _createConversation(name: string, image: string, progenitor: AgentPubKey, membrane_proof: MembraneProof|undefined, networkSeed: string|undefined) : Promise<ConversationCellAndConfig> {
    const properties: Properties = {
      progenitor: encodeHashToBase64(progenitor),
      name
    }

    const conversationId = networkSeed || uuidv4()

    const cloneReq : AppCreateCloneCellRequest = {
      role_name: this.roleName,
      name,
      membrane_proof,
      modifiers: {
        network_seed: conversationId,
        properties
      },
    }

    console.log("creating clone cell", cloneReq)
    const cell = await this.client.createCloneCell(cloneReq)
    console.log("created clone cell", cell)
    let config:Config = {title: name, image}
    if (!networkSeed) {
      await this._setConfig(config, cell.cell_id)
    }
    await this.setMyProfileForConversation(cell.cell_id)

    const convoCellAndConfig: ConversationCellAndConfig = {cell, config}
    this.conversations[conversationId] = convoCellAndConfig
    return convoCellAndConfig
  }

  public async getAllMessages(conversationId: string) : Promise<Array<MessageRecord>> {
    const messages = await this.callZome("get_all_message_entries", null, this.conversations[conversationId].cell.cell_id);
    return messages
  }

  public async getMessagesByWeek(conversationId: string, week?: string) : Promise<Array<MessageRecord>> {
    return this.callZome("get_messages_hashes_for_week", { week }, this.conversations[conversationId].cell.cell_id);
  }

  public async getAllAgents(conversationId: string) : Promise<{ [key: AgentPubKeyB64]: Profile }> {
    const cellId = this.conversations[conversationId].cell.cell_id;

    const req: AppCallZomeRequest = {
      cell_id: cellId,
      zome_name: 'profiles',
      fn_name: 'get_agents_with_profile',
      payload: null,
    };
    const agentsResponse = await this.client.callZome(req, 30000);

    return await agentsResponse.reduce(async (resultsPromise: { [key: AgentPubKeyB64]: Profile }, a: any) => {
        const agentRecord = await this.client.callZome({
          cell_id: cellId,
          zome_name: 'profiles',
          fn_name: 'get_agent_profile',
          payload: a
        }, 30000);
        const results = await resultsPromise;
        results[encodeHashToBase64(a)] = decode(agentRecord.entry.Present.entry) as Profile
        return results
      }, Promise.resolve<{ [key: AgentPubKeyB64]: Profile }>({})
    )
  }

  async _setConfig(config:Config, cellId:CellId) : Promise<null> {
    console.log("creating config:", name)
    return this.callZome(
      'set_config',
      config,
      cellId
    )
  }

  async _getConfig(cellId:CellId) : Promise<EntryRecord<Config>|undefined> {
    const config = await this.callZome(
      'get_config',
      null,
      cellId
    )
    return config ? new EntryRecord(config) : undefined
  }

  public async sendMessage(conversationId: string, content: string, agents: AgentPubKey[]) {
    console.log("sending message", conversationId, content, this.conversations[conversationId])
    const message = await this.callZome(
      'create_message',
      {
        message: { content },
        agents
      },
      this.conversations[conversationId].cell.cell_id
    )
    console.log("sent message and got back", message, decode(message.entry.Present.entry))
    return message
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
    return await this.client.callZome(req, 30000);
  }

  public async inviteAgentToConversation(conversationId: string, forAgent: AgentPubKey, role: number = 0): Promise<MembraneProof | undefined> {
    try {
      const conversation = this.conversations[conversationId]
      console.log("client.inviteAgentToConversation", conversationId, forAgent, role, conversation)

      const data: MembraneProofData = {
        conversation_id: conversation.cell.dna_modifiers.network_seed,
        for_agent: forAgent,
        as_role: role,
      }
      const r = await this.callZome("generate_membrane_proof", data, conversation.cell.cell_id);
      console.log("client.inviteAgentToConversation returning proof", r)
      return r
    } catch(e) {
      console.log("Error generating membrane proof", e)
    }
    return undefined
  }

  protected async callZome(fn_name: string, payload: any, cell_id: any) {
    console.log("call zome", fn_name, payload, cell_id)
    const req: AppCallZomeRequest = {
      //role_name: cell_id ? undefined : this.roleName,
      cell_id,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return await this.client.callZome(req, 30000);
  }
}