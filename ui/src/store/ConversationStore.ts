import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type ActionHashB64, type ActionHash } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import { type Config, type Conversation, type Image, type Invitation, type Message, type MessageRecord, Privacy, type Messages, } from '../types';
import { Bucket } from './bucket';
import { MsgHistory } from './msgHistory';

export const MINUTES_IN_BUCKET = 1  // 60 * 24 * 7  // 1 week
export const MIN_MESSAGES_LOAD = 30

export class ConversationStore {
  private conversation: Writable<Conversation>;
  private history: MsgHistory 
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

    const currentBucket = this.currentBucket()
    this.history = new MsgHistory(currentBucket, this.cellDnaHash)
    
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
    const buckets = this.history.bucketsForSet(MIN_MESSAGES_LOAD, bucket)
    console.log("LOADING FROM", buckets)
    const messageHashes:ActionHashB64[] = []
    for (const b of buckets) {
      messageHashes.push(... await this.getMessagesForBucket(b))
    }
    console.log("FOUND", messageHashes)
    return [bucket - buckets.length +1,messageHashes]
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
      let bucket = this.history.getBucket(b)
      bucket.ensureIsHashType()
      const count = bucket.count
      const messageHashes = await this.client.getMessageHashes(this.data.id, b, count)

      const messageHashesB64 = messageHashes.map(h => encodeHashToBase64(h))
      const missingHashes = bucket.missingHashes(messageHashesB64)
      if (missingHashes.length > 0) {
        bucket.add(missingHashes)
        this.history.saveBucket(b)
      }

      console.log("Bucket ",b, " has ", messageHashesB64)
      console.log("Bucket ",b, " missing ", missingHashes)

      console.log("Our records have", bucket.hashes)
      const hashesToLoad: Array<ActionHash> = []
      bucket.hashes.forEach(h=> {
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
              message.images = ((message.images as any[]) || []).map(i => ({
                fileType: i.file_type,
                lastModified: i.last_modified,
                name: i.name,
                size: i.size,
                storageEntryHash: i.storage_entry_hash,
                status: 'loading'
              }))
              message.status = 'confirmed'

              // Async load the images
              this.loadImagesForMessage(message)

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
            message.images = ((message.images as any[]) || []).map(i => ({
              fileType: i.file_type,
              lastModified: i.last_modified,
              name: i.name,
              size: i.size,
              storageEntryHash: i.storage_entry_hash,
              status: 'loading'
            }))
            message.status = 'confirmed'

            // Async load the images
            this.loadImagesForMessage(message)

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

      // TODO: only add/update new messages
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

  async sendMessage(authorKey: string, content: string, images: Image[]) {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date()
    const bucket = this.bucketFromDate(now)
    const id = uuidv4()
    const oldMessage: Message = { authorKey, content, hash: id, status: 'pending', timestamp: now, bucket, images}
    this.addMessage(oldMessage)
    const newMessageEntry = await this.client.sendMessage(this.data.id, content, bucket, images, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)))
      const newMessage: Message = {
        ...oldMessage,
        hash: encodeHashToBase64(newMessageEntry.actionHash),
        status: 'confirmed',
        images: images.map(i => ({ ...i, status: 'loaded' }))
      }
      this.updateMessage(oldMessage, newMessage)
  }

  addMessage(message: Message): void {
    console.log("ADD MSG", message)
    this.conversation.update(conversation => {
      message.images = message.images || [];
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });
    if (message.hash.startsWith("uhCkk")) {  // don't add placeholder to bucket yet.
      this.history.add(message)
    }
  }



  updateMessage(oldMessage: Message, newMessage: Message): void {
    this.conversation.update(conversation => {
      const messages = {...conversation.messages}
      delete messages[oldMessage.hash]
      return { ...conversation, messages: {...messages, [newMessage.hash]: newMessage } };
    })
  }

  async loadImagesForMessage(message: Message, tryCount: number = 0) {
    if (message.images && message.images.length > 0) {
      // We have to load them all and then update the message otherwise the various updates overwrite each other
      for (const image of message.images) {
        console.log("loading", image)
        const newImage = await this.loadImage(image)
        this.conversation.update(conversation => {
          const messages = {...conversation.messages}
          const msg = messages[message.hash]
          if (msg) {
            const images = msg.images.map(i => i.name === newImage.name ? newImage : i)
            messages[message.hash] = { ...msg, images }
          }
          return { ...conversation, messages }
        })
      }
    }
  }

  async loadImage(image: Image, tryCount: number = 0): Promise<Image> {
    return new Promise(async (resolve, reject) => {
      try {
        if (image.status === 'loaded' || !image.storageEntryHash) return resolve(image)

        const file = await this.client.fileStorageClient.downloadFile(image.storageEntryHash)

        // read the dataUrl from the image file
        const reader = new FileReader()
        reader.readAsDataURL(file)
        resolve(new Promise((resolve, reject) => {
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              const newImage: Image = { ...image, status: 'loaded', dataURL: reader.result}
              resolve(newImage)
            }
          }
          reader.onerror = () => {
            const newImage: Image = { ...image, status: 'error', dataURL: ''}
            resolve(newImage)
          }
        }))
      } catch(e) {
        if (tryCount < 10) {
          setTimeout(() => {
            resolve(this.loadImage(image, tryCount + 1))
          }, 3000)
        } else {
          console.log("Coulnd't find image after 10 retries", image)
          resolve({ ...image, status: 'error', dataURL: ''})
        }
      }
    })
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
