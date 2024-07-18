import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type Timestamp } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import { type Config, type Conversation, type Invitation, type Message, type MessageRecord, Privacy } from '../types';

export const DAYS_IN_BUCKET = 7

export class ConversationStore {
  private conversation: Writable<Conversation>;

  constructor(
    public client: RelayClient,
    public id: string,
    public cellDnaHash: DnaHash,
    public config: Config,
    public created: Timestamp,
    public privacy: Privacy,
    public progenitor: AgentPubKey,
  ) {
    this.conversation = writable({ id, cellDnaHash, config, privacy, progenitor, agentProfiles: {}, messages: {} });
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

  async getAgents() {
    const agentProfiles = await this.client.getAllAgents(this.data.id)
    this.conversation.update(c => {
      c.agentProfiles = {...agentProfiles}
      return c
    })
    return agentProfiles
  }

  async getConfig() {
    const config = await this.client._getConfig(this.data.id)
    if (config) {
      this.conversation.update(c => {
        c.config = {...config.entry}
        return c
      })
      return config.entry
    }
    return null
  }

  async getMessages() {
    try {
      const newMessages: { [key: string] : Message } = this.data.messages
      const messageRecords: Array<MessageRecord> = await this.client.getAllMessages(this.data.id, [0])
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
          console.error("Unable to parse message, ignoring", messageRecord, e)
        }
      }
      this.conversation.update(c => {
        c.messages = {...newMessages}
        return c
      })
      return newMessages
    } catch (e) {
      //@ts-ignore
      console.error("Error getting messages", e)
    }
    return []
  }

  bucketFromTimestamp(timestamp: Timestamp) : number {
    const diff = timestamp - this.created
    return Math.round(diff / (DAYS_IN_BUCKET * 24 * 60 * 60 * 1000 * 1000))
  }

  sendMessage(authorKey: string, content: string): void {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date()
    const bucket = this.bucketFromTimestamp(now.getTime()*1000)
    this.addMessage({ authorKey, content, hash: uuidv4(), status: 'pending', timestamp: now, bucket })
    this.client.sendMessage(this.data.id, content, bucket, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)));
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });
  }

  get publicInviteCode() {
    if (this.data.privacy === Privacy.Public) {
      const invitation: Invitation = {
        conversationName: this.data.config.title,
        networkSeed: this.data.id,
        privacy: this.data.privacy,
        progenitor: this.data.progenitor
      }
      const msgpck = encode(invitation);
      return Base64.fromUint8Array(msgpck);
    } else {
      return ''
    }
  }
}
