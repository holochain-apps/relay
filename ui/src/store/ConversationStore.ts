import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import type { Config, Conversation, Invitation, Message, MessageRecord } from '../types';

export class ConversationStore {
  private conversation: Writable<Conversation>;

  constructor(public client: RelayClient, id: string, cellDnaHash: DnaHash, config:Config, public progenitor: AgentPubKey) {
    this.conversation = writable({ id, cellDnaHash, config, progenitor, agentProfiles: {}, messages: {} });
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
      const newMessages: { [key: string] : Message } = this.data.messages
      const messageRecords: Array<MessageRecord> = await this.client.getAllMessages(this.data.id)
      for (const messageRecord of messageRecords) {
        try {
          const message = messageRecord.message
          if (message) {
            message.hash = encodeHashToBase64(messageRecord.signed_action.hashed.hash)
            message.timestamp = new Date(messageRecord.signed_action.hashed.content.timestamp / 1000)
            message.authorKey = encodeHashToBase64(messageRecord.signed_action.hashed.content.author)
            message.status = 'confirmed'

            if (!newMessages[message.hash]) {
              const matchesPending = Object.values(this.data.messages).find(m => m.status === 'pending' && m.authorKey === message.authorKey && m.content === message.content);
              if (matchesPending) {
                delete newMessages[matchesPending.hash]
              }
              newMessages[message.hash] = message
            }
          }
        } catch(e) {
          console.log("Unable to parse message, ignoring", messageRecord, e)
        }
      }
      this.conversation.update(c => {
        c.messages = {...newMessages}
        return c
      })
      return newMessages
    } catch (e) {
      //@ts-ignore
      console.log("Error getting messages", e)
    }
    return []
  }

  async getAgents() {
    const agentProfiles = await this.client.getAllAgents(this.data.id)
    this.conversation.update(c => {
      c.agentProfiles = {...agentProfiles}
      return c
    })
    return agentProfiles
  }

  sendMessage(authorKey: string, content: string): void {
    // Use temporary uuid as the hash until we get the real one back from the network
    this.addMessage({ authorKey, content, hash: uuidv4(), status: 'pending', timestamp: new Date() })
    this.client.sendMessage(this.data.id, content, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)));
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });
  }

  get publicInviteCode() {
    const invitation: Invitation = {
      conversationName: this.data.config.title,
      progenitor: this.data.progenitor,
      networkSeed: this.data.id
    }
    const msgpck = encode(invitation);
    return Base64.fromUint8Array(msgpck);
  }
}
