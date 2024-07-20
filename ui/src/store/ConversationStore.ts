import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type ActionHashB64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import { type Config, type Conversation, type Invitation, type Message, type MessageRecord, Privacy, type Bucket, type Messages, BucketType, type SerializableBucket } from '../types';

export const MINUTES_IN_BUCKET = 1  // 60 * 24 * 7  // 1 week
export const MIN_MESSAGES_LOAD = 30

export class ConversationStore {
  private conversation: Writable<Conversation>;
  private buckets: Array<Bucket> = []
  public lastBucketLoaded: number = -1

  constructor(
    public client: RelayClient,
    public id: string,
    public cellDnaHash: DnaHash,
    public config: Config,
    public created: number,
    public privacy: Privacy,
    public progenitor: AgentPubKey,
  ) {
    const messages: Messages = {}

    const dnaB64 = encodeHashToBase64(cellDnaHash)
    const currentBucket = this.currentBucket()
    for (let b = 0; b<= currentBucket;  b+=1) {
      const historyStr = localStorage.getItem(`c.${dnaB64}.${b}`)
      if (historyStr) {
        try {
          const sb: SerializableBucket = JSON.parse(historyStr)
          if (sb.type == BucketType.Hashes) {
            this.buckets[b] = {type: sb.type, hashes: new Set(sb.hashes) }
          } else {
            this.buckets[b] = sb
          }
          console.log("LOADING BUCKET:",b, this.buckets[b])
        } catch(e) {
          console.log("badly formed history for ",dnaB64,e)
        }
      }
      if (this.buckets[b] === undefined) {
        this.buckets[b] = {
          type: BucketType.Hashes,
          hashes: new Set()
        }
      }
    }
    this.conversation = writable({ id, cellDnaHash, config, privacy, progenitor, agentProfiles: {}, messages });
  }

  async initialize() {
    await this.getAgents()
    await this.loadMessagesSet()
  }

  async loadMessagesSet() {
    if (this.lastBucketLoaded == 0) return

    let bucket = this.lastBucketLoaded < 0 ? this.currentBucket() : this.lastBucketLoaded-1
    const buckets:Array<number> = []
    let count = 0
    // add buckets until we get to threshold of what to load
    do {
      buckets.push(bucket)
      const h = this.buckets[bucket]
      console.log("BUCKET ", bucket, h, count)
      if (h) {
        const size = h.type == BucketType.Count ? h.count : h.hashes.size
        console.log("size", size)
        count += size
      }
      bucket-=1
    } while (bucket >= 0 && count < MIN_MESSAGES_LOAD)
    this.lastBucketLoaded = bucket+1
    await this.getMessages(buckets)
    
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

  async getMessages(buckets: Array<number>) {
    try {
      const newMessages: { [key: string] : Message } = this.data.messages
      const messageRecords: Array<MessageRecord> = await this.client.getAllMessages(this.data.id, buckets)
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

  bucketFromTimestamp(timestamp: number) : number {
    const diff = timestamp - this.created
    return Math.round(diff / (MINUTES_IN_BUCKET * 60 * 1000))
  }

  bucketFromDate(date: Date) : number {
    return this.bucketFromTimestamp(date.getTime())
  }

  currentBucket() :number {
    return this.bucketFromDate(new Date())
  }

  sendMessage(authorKey: string, content: string): void {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date()
    const bucket = this.bucketFromDate(now)
    this.addMessage({ authorKey, content, hash: uuidv4(), status: 'pending', timestamp: now, bucket })
    this.client.sendMessage(this.data.id, content, bucket, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)));
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });
    const bucket = this.buckets[message.bucket]
    if (bucket === undefined) { 
      const hashes:Set<ActionHashB64> = new Set() 
      hashes.add(message.hash)
      this.buckets[message.bucket] = {
        type: BucketType.Hashes,
        hashes
      }
    } else if (bucket.type === BucketType.Hashes) {
      bucket.hashes.add(message.hash)
    }
    else if (bucket.type === BucketType.Count) {
      bucket.count += 1
    }
    this.saveBucket(message.bucket)
  }

  saveBucket(b: number) {
    const dnaB64 = encodeHashToBase64(this.cellDnaHash)
    const bucket = this.buckets[b]
    const sb: SerializableBucket = bucket.type == BucketType.Hashes ? 
      {type:BucketType.Hashes, hashes:Array.from(bucket.hashes.keys())} : bucket
    localStorage.setItem(`c.${dnaB64}.${b}`, JSON.stringify(sb))
  }

  get publicInviteCode() {
    if (this.data.privacy === Privacy.Public) {
      const invitation: Invitation = {
        created: this.created,
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
