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
import type { EntryTypes, MembraneProofData, MessageRecord, Properties } from '../types';
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
  conversations: {[key: string]: ClonedCell} = {}
  zomeName = ZOME_NAME

  constructor(public client: AppClient, public roleName: RoleName, public profilesStore: ProfilesStore) {
    //super(client, roleName, zomeName);
  }

  myPubKey() : AgentPubKey {
    return this.client.myPubKey
  }

  myPubKeyB64() : AgentPubKeyB64 {
    return encodeHashToBase64(this.client.myPubKey)
  }

  async initConversations() {
    const appInfo = await this.client.appInfo()
    console.log("appInfo", appInfo)

    if (appInfo) {
      // appInfo.cell_info.modifiers

      const cells: CellInfo[] = appInfo.cell_info[this.roleName].filter(
        (c) => CellType.Cloned in c
      );
      // @ts-ignore
      const conversations = cells.reduce((result, c:CellInfo) => { result[c[CellType.Cloned].clone_id] = c[CellType.Cloned]; return result }, {})
      console.log("Init conversations", conversations)
      this.conversations = conversations
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

  async createConversation(name: string) : Promise<ClonedCell> {
    return this._createConversation(name, this.client.myPubKey, undefined, undefined)
  }

  async joinConversation(name: string, progenitor: AgentPubKey, proof: MembraneProof|undefined, networkSeed: string) : Promise<ClonedCell> {
    return this._createConversation(name, progenitor, proof, networkSeed)
  }

  async _createConversation(name: string, progenitor: AgentPubKey, membrane_proof: MembraneProof|undefined, networkSeed: string|undefined) : Promise<ClonedCell> {
    const properties: Properties = {
      progenitor: encodeHashToBase64(progenitor),
      name
    }

    const cloneReq : AppCreateCloneCellRequest = {
      role_name: this.roleName,
      name,
      membrane_proof,
      modifiers: {
        network_seed: networkSeed || uuidv4(),
        properties
      },
    }

    console.log("creating clone cell", cloneReq)
    const cell = await this.client.createCloneCell(cloneReq)
    console.log("created clone cell", cell)
    await this.setMyProfileForConversation(cell.cell_id)

    // TODO: why get all conversations when creating/joining a new one? why not only the new one?
    await this.initConversations()
    return cell
  }

  public async getAllMessages(conversationId: string) : Promise<Array<MessageRecord>> {
    const messages = await this.callZome("get_all_message_entries", null, this.conversations[conversationId].cell_id);
    return messages
  }

  public async getMessagesByWeek(conversationId: string, week?: string) : Promise<Array<MessageRecord>> {
    return this.callZome("get_messages_hashes_for_week", { week }, this.conversations[conversationId].cell_id);
  }

  public async getAllAgents(conversationId: string) : Promise<{ [key: AgentPubKeyB64]: Profile }> {
    const cellId = this.conversations[conversationId].cell_id;

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

  public async sendMessage(conversationId: string, content: string, agents: AgentPubKey[]) {
    console.log("sending message", conversationId, content, this.conversations[conversationId])
    const message = await this.callZome(
      'create_message',
      {
        message: { content },
        agents
      },
      this.conversations[conversationId].cell_id
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
        conversation_name: conversation.name,
        for_agent: forAgent,
        as_role: role,
      }
      const r = await this.callZome("generate_membrane_proof", data, conversation.cell_id);
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