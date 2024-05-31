import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, Invitation, Message, MessageRecord } from '../types';

export class ConversationStore {
  private conversation: Writable<Conversation>;

  constructor(public client: RelayClient, id: string, cellDnaHash: DnaHash, name: string, public progenitor: AgentPubKey, networkSeed: string) {
    this.conversation = writable({ id, cellDnaHash, name, networkSeed, progenitor, agentProfiles: {}, messages: [] });
  }

  async initialize() {
    await this.getAgents()
    await this.getMessages()
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
      for (const messageRecord of messages) {
        try {
          const message = messageRecord.message
          if (message) {
            message.id = encodeHashToBase64(messageRecord.signed_action.hashed.hash)
            message.timestamp = new Date(messageRecord.signed_action.hashed.content.timestamp / 1000)
            message.authorKey = encodeHashToBase64(messageRecord.signed_action.hashed.content.author)
            const exists = this.data.messages.some(m => m.id === message.id);
            if (!exists) {
              this.conversation.update(c => {
                c.messages = [...c.messages, message]
                return c
              })
            }
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
  }

  sendMessage(authorKey: string, content: string): void {
    this.addMessage({ authorKey, content, timestamp: new Date() })
    this.client.sendMessage(this.data.id, content, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)));
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      message.id = message.id || String(conversation.messages.length + 1);
      return { ...conversation, messages: [...conversation.messages, message] };
    });
  }

  get publicInviteCode() {
    const invitation: Invitation = {
      conversationName: this.data.name,
      progenitor: this.data.progenitor,
      networkSeed: this.data.networkSeed
    }
    const msgpck = encode(invitation);
    return Base64.fromUint8Array(msgpck);
  }
}
