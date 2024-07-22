import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type ActionHashB64, type ActionHash } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import { type Config, type Conversation, type Invitation, type Message, type MessageRecord, Privacy, type Messages, } from '../types';
import { Bucket } from './bucket';
import { entries } from 'lodash-es';

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
      const bucketJSON = localStorage.getItem(`c.${dnaB64}.${b}`)
      this.buckets[b] = bucketJSON ? new Bucket(bucketJSON) : new Bucket(undefined)
    }
    this.conversation = writable({ id, cellDnaHash, config, privacy, progenitor, agentProfiles: {}, messages });
  }

  async initialize() {
    await this.getAgents()
    await this.loadMessagesSet()
  }

  async loadMessagesSet(): Promise<Array<ActionHashB64>> {
    console.log("loadMessageSet", this.lastBucketLoaded)
    if (this.lastBucketLoaded == 0) return []

    let bucket = this.lastBucketLoaded < 0 ? this.currentBucket() : this.lastBucketLoaded-1
    let [lastBucketLoaded, messageHashes] =  await this.loadMessageSetFrom(bucket)
    this.lastBucketLoaded = lastBucketLoaded
    return messageHashes
  }

  async loadMessageSetFrom(bucket: number) : Promise<[number,ActionHashB64[]]> {
    const buckets:Array<number> = []
    let count = 0
    // add buckets until we get to threshold of what to load
    do {
      buckets.push(bucket)
      const h = this.buckets[bucket]
      console.log("BUCKET ", bucket, h, count)
      if (h) {
        const size = h.count
        console.log("size", size)
        count += size
      }
      bucket-=1
    } while (bucket >= 0 && count < MIN_MESSAGES_LOAD)
    console.log("LOADING FROM", buckets)
    const messageHashes:ActionHashB64[] = []
    for (const b of buckets) {
      messageHashes.push(... await this.getMessagesForBucket(b))
    }
    console.log("FOUND", messageHashes)
    return [bucket+1,messageHashes]
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

  async getMessagesForBucket(b: number) {
    try {
      const newMessages: { [key: string] : Message } = this.data.messages
      let bucket = this.buckets[b]
      if (bucket === undefined) {
        bucket = new Bucket([])
        this.buckets[b] = bucket
      }
      bucket.ensureIsHashType()
      const count = bucket.count
      const messageHashes = await this.client.getMessageHashes(this.data.id, b, count)

      const messageHashesB64 = messageHashes.map(h => encodeHashToBase64(h))
      const missingHashes = bucket.missingHashes(messageHashesB64)
      if (missingHashes.length > 0) {
        bucket.add(missingHashes)
        this.saveBucket(b)
      }

      console.log("Bucket ",b, " has ", messageHashesB64)
      console.log("Bucket ",b, " missing ", missingHashes)

      console.log("Our records have", bucket.hashes)
      const hashesToLoad: Array<ActionHash> = []
      bucket.hashes.forEach(h=> {
        console.log(h)
        if (!newMessages[h]) hashesToLoad.push(decodeHashFromBase64(h))
      })
      console.log("we don't have loaded ", hashesToLoad)

      if (hashesToLoad.length>0) {
        const messageRecords: Array<MessageRecord> = await this.client.getMessageEntries(this.data.id, hashesToLoad)
        if (hashesToLoad.length != messageRecords.length) {
          console.log("Warning: not all requested hashes were loaded")
        }
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
                  console.log("DELETE", matchesPending.hash)
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
        return Object.keys(newMessages)
      }
    } catch (e) {
      //@ts-ignore
      console.error("Error getting messages", e)
    }
    return []
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

   sendMessage(authorKey: string, content: string) {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date()
    const bucket = this.bucketFromDate(now)
    const id = uuidv4()
    const msg:Message = { authorKey, content, hash: id, status: 'pending', timestamp: now, bucket }
    //this.addMessage(msg)
    this.client.sendMessage(this.data.id, content, bucket, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k))).then(record=>{
      console.log("REC", record)
      const message: Message = {
        hash: encodeHashToBase64(record.actionHash),
        authorKey,
        content: record.entry.content,
        bucket: record.entry.bucket,
        status: 'confirmed',
        timestamp: new Date(record.action.timestamp / 1000)
      }
      this.conversation.update(conversation => {
        // console.log("DELETING", id)
       // delete conversation.messages[id]
        conversation.messages[message.hash] = message
        //conversation.messages["1"] = message
        return conversation
        //return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
      })
      })
  }

  addMessage(message: Message): void {
    console.log("ADD MSG", message)
    this.conversation.update(conversation => {
      conversation.messages[message.hash] = message
      return conversation
//      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };

    });
    if (message.hash.startsWith("uhCkk")) {  // don't add placeholder to bucket yet.
      const bucket = this.buckets[message.bucket]
      if (bucket === undefined) { 
        this.buckets[message.bucket] = new Bucket([message.hash])
      } else {
        bucket.add([message.hash])
      }
      this.saveBucket(message.bucket)
    }
  }

  saveBucket(b: number) {
    const dnaB64 = encodeHashToBase64(this.cellDnaHash)
    const bucket = this.buckets[b]
    localStorage.setItem(`c.${dnaB64}.${b}`, bucket.toJSON())
    console.log("Saved Bucket", b, bucket)
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
