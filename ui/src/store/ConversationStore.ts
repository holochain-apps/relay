import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, MessageRecord } from '../types';

export class ConversationStore {
  private conversation: Writable<Conversation>;

  constructor( public client: RelayClient, id: string, cellDnaHash: DnaHash, name: string, public progenitor: AgentPubKey|undefined) {
    console.log("new onversation store", id, name, progenitor)
    this.conversation = writable({ id, cellDnaHash, name, messages: [], progenitor, agentProfiles: {} });
  }

async initialize() {
    await this.getMessages()
    await this.getAgents()
  }

  get data() {
    return get(this.conversation);
  }

  subscribe(run: any) {
    return this.conversation.subscribe(run);
  }

  async getMessages() {
    try {
      //const messages: Array<MessageRecord> = await this.client.getMessagesByWeek()
      const messages: Array<MessageRecord> = await this.client.getAllMessages(this.data.id)
      console.log("getMessages returned", messages)
      for (const messageRecord of messages) {
        try {
          const message = messageRecord.message
          if (message) {
            message.id = encodeHashToBase64(messageRecord.original_action)
            message.timestamp = new Date(messageRecord.signed_action.hashed.content.timestamp / 1000)
            this.conversation.update(c => {
              c.messages = [...c.messages, message]
              return c
            })
          }
        } catch(e) {
          console.log("Unable to parse message, ignoring", messageRecord, e)
        }
      }
    } catch (e) {
      //@ts-ignore
      console.log("Error getting messages", e)
    }
  }

  async getAgents() {
    const agentProfiles = await this.client.getAllAgents(this.data.id)
    this.conversation.update(c => {
      c.agentProfiles = {...c.agentProfiles, ...agentProfiles}
      return c
    })
    console.log("got agents:", agentProfiles, this.data.agentProfiles)
  }

  sendMessage(author: string, content: string): void {
    console.log("sendMessage", content)
    this.addMessage(author, content)
    this.client.sendMessage(this.data.id, content, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)));
  }

  addMessage(author: string, content: string): void {
    this.conversation.update(conversation => {
      const message = { id: String(conversation.messages.length + 1), author, content, timestamp: new Date() };
      return { ...conversation, messages: [...conversation.messages, message] };
    });
  }
}
