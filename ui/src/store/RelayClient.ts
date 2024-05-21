import {
  CellType,
  encodeHashToBase64,
  type AgentPubKey,
  type AppAgentClient,
  type AppCreateCloneCellRequest,
  type AppAgentCallZomeRequest,
  type ClonedCell,
  type CellInfo,
  type RoleName,
  type MembraneProof
} from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord, LazyHoloHashMap, ZomeClient } from '@holochain-open-dev/utils';
import type { ActionCommittedSignal } from '@holochain-open-dev/utils';
import type { Profile } from '@holochain-open-dev/profiles'
// import { type Message, Stream, type Payload } from './stream';
import type { EntryTypes, Message, MessageInput, MessageRecord, Properties } from '../types';
import type { Agent } from 'http';

const ZOME_NAME = 'relay'

// export type SignalMessage = {
//   payload: Payload;
//   from: AgentPubKey;
//   received: number;
// }

export type RelaySignal = ActionCommittedSignal<EntryTypes, any>;

//export class RelayClient extends ZomeClient<RelaySignal> {
export class RelayClient {
  //conversations: Array<ClonedCell> = []
  // conversations is a map of string to ClonedCell
  conversations: {[key: string]: ClonedCell} = {}
  nickname: string = ""

  constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = ZOME_NAME) {
    //super(client, roleName, zomeName);
  }

  agentPubKey() : AgentPubKey {
    return this.client.myPubKey
  }

  async initConversations() {
    const appInfo = await this.client.appInfo()
    console.log("appInfo", appInfo)

    if (appInfo) {
      appInfo.cell_info.modifiers

      const cells: CellInfo[] = appInfo.cell_info[this.roleName].filter(
        (c) => CellType.Cloned in c
      );
      // @ts-ignore
      const conversations = cells.reduce((result, c:CellInfo) => { console.log("mee", c, result); result[c[CellType.Cloned].clone_id] = c[CellType.Cloned]; return result }, {})
      console.log("conversations111", conversations)
      this.conversations = conversations
    }
  }

  async createConversation(name: string) : Promise<string> {
    return this._createConversation(name, this.client.myPubKey, undefined)
  }

  async joinConversation(name: string, progenitor: AgentPubKey, proof: MembraneProof) : Promise<string> {
    return this._createConversation(name, progenitor, proof)
  }

  async _createConversation(name: string, progenitor: AgentPubKey, membrane_proof: MembraneProof|undefined) : Promise<string> {
    const properties: Properties = {
      progenitor: encodeHashToBase64(progenitor),
      name
    }

    const cloneReq : AppCreateCloneCellRequest = {
      role_name: this.roleName,
      name,
      membrane_proof,
      modifiers: {
        properties
      },
    }

    console.log("creating clone cell", cloneReq)
    const cell = await this.client.createCloneCell(cloneReq)
    console.log("created clone cell", cell)
    // await this.setMyNicknameForConversation(cell.clone_id, this.nickname)

    await this.initConversations()
    return cell.clone_id
  }

  public async getAllMessages(conversationId: string) : Promise<Array<MessageRecord>> {
    const messages = await this.callZome("get_all_message_entries", null, this.conversations[conversationId].cell_id);
    await Promise.all(
      messages.map(async (messageRecord: MessageRecord) => {
        if (messageRecord.message) {
          const req: AppAgentCallZomeRequest = {
            role_name: 'relay',
            // cell_id: this.conversations[conversationId].cell_id,
            zome_name: 'profiles',
            fn_name: 'get_agent_profile',
            payload: messageRecord.signed_action.hashed.content.author,
          };
          const authorAgent = await this.client.callZome(req, 30000);
          messageRecord.message.author = (decode(authorAgent.entry.Present.entry) as Profile).nickname
        }
      })
    )
    return messages
  }

  public async getMessagesByWeek(conversationId: string, week?: string) : Promise<Array<MessageRecord>> {
    return this.callZome("get_messages_hashes_for_week", { week }, this.conversations[conversationId].cell_id);
  }

  public async sendMessage(conversationId: string, content: string, agents: AgentPubKey[]) {
    console.log("sending message", conversationId, content, this.conversations[conversationId])
    const message = await this.callZome(
      'create_message',
      {
        // conversationId,
        content
        // agents
      },
      this.conversations[conversationId].cell_id
    )
    console.log("sent message and got back", message, decode(message.entry.Present.entry))
    return message
  }

  public async setMyNickname(nickname:string) {
    this.nickname = nickname
    Object.values(this.conversations).forEach((cell) => {
      this.setMyNicknameForConversation(cell.clone_id, nickname)
    })
  }

  public async setMyNicknameForConversation(conversationId: string, nickname:string) : Promise<null> {
    return this.callZome("set_nickname", { nickname }, this.conversations[conversationId].cell_id)
  }

  protected async callZome(fn_name: string, payload: any, cell_id: any) {
    console.log("call zome", fn_name, payload, cell_id)
    const req: AppAgentCallZomeRequest = {
      //role_name: cell_id ? undefined : this.roleName,
      cell_id,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return await this.client.callZome(req, 30000);
  }
}