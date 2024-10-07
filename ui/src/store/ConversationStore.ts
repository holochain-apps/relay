import { isEmpty, uniq } from 'lodash-es';
import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type CellId, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type ActionHashB64, type ActionHash } from "@holochain/client";
import { FileStorageClient } from "@holochain-open-dev/file-storage";
import { derived, get, writable, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { t } from '$lib/translations';
import LocalStorageStore from '$store/LocalStorageStore'
import { RelayStore } from '$store/RelayStore'
import {
  type Config,
  type Contact,
  type Conversation,
  type Image,
  type Invitation,
  type LocalConversationData,
  type Message,
  type MessageRecord,
  Privacy,
  type Messages } from '../types';
import { MsgHistory } from './msgHistory';

export const MINUTES_IN_BUCKET = 60 * 24 * 1  // 1 day for now
export const MIN_MESSAGES_LOAD = 20

export class ConversationStore {
  public conversation: Writable<Conversation>
  public history: MsgHistory
  public lastBucketLoaded: number = -1
  public lastMessage: Writable<Message | null>
  public localDataStore: Writable<LocalConversationData>
  private client
  private fileStorageClient: FileStorageClient

  constructor(
    public relayStore: RelayStore,
    public id: string,
    public cellId: CellId,
    public config: Config,
    public created: number,
    public privacy: Privacy,
    public progenitor: AgentPubKey,
  ) {
    const messages: Messages = {}

    const currentBucket = this.currentBucket()
    this.history = new MsgHistory(currentBucket, this.cellId[0])

    this.conversation = writable({ id, cellId, config, privacy, progenitor, agentProfiles: {}, messages });
    this.localDataStore = LocalStorageStore<LocalConversationData>(`conversation_${this.data.id}`, { archived: false, invitedContactKeys: [], open: false, unread: false })
    this.lastMessage = writable(null)
    this.client = relayStore.client
    this.fileStorageClient = new FileStorageClient(this.client.client, 'relay', 'file_storage', cellId)
  }

  async initialize() {
    await this.fetchAgents()
    await this.loadMessagesSet()
  }

  // 1. looks in the history, starting at a current bucket, for hashes, and retrieves all
  // the actual messages in that bucket as well as any earlier buckets necessary
  // such that at least MIN_MESSAGES_LOAD messages.
  // 2. then updates the "lateBucketLoaded" state variable so the next time earlier buckets
  // will be loaded.
  async loadMessagesSet(): Promise<Array<ActionHashB64>> {
    if (this.lastBucketLoaded == 0) return []

    let bucket = this.lastBucketLoaded < 0 ? this.currentBucket() : this.lastBucketLoaded-1
    let [lastBucketLoaded, messageHashes] =  await this.loadMessageSetFrom(bucket)
    this.lastBucketLoaded = lastBucketLoaded
    return messageHashes
  }

  // looks in the history starting at a bucket number for hashes, and retrieves all
  // the actual messages in that bucket as well as any earlier buckets necessary
  // such that at least MIN_MESSAGES_LOAD messages.
  async loadMessageSetFrom(bucket: number) : Promise<[number,ActionHashB64[]]> {
    const buckets = this.history.bucketsForSet(MIN_MESSAGES_LOAD, bucket)
    const messageHashes:ActionHashB64[] = []
    for (const b of buckets) {
      messageHashes.push(... await this.getMessagesForBucket(b))
    }
    return [bucket - buckets.length +1, messageHashes]
  }

  async fetchAgents() {
    const agentProfiles = await this.client.getAllAgents(this.data.id)
    this.conversation.update(c => {
      c.agentProfiles = {...agentProfiles}
      return c
    })
    return agentProfiles
  }

  subscribe(run: any) {
    return this.conversation.subscribe(run);
  }

  /****** Getters ******/
  get data() {
    return get(this.conversation);
  }

  get publicInviteCode() {
    if (this.data.privacy === Privacy.Public) {
      const invitation: Invitation = {
        created: this.created,
        networkSeed: this.data.id,
        privacy: this.data.privacy,
        progenitor: this.data.progenitor,
        title: this.title,
      }
      const msgpck = encode(invitation);
      return Base64.fromUint8Array(msgpck);
    } else {
      return ''
    }
  }

  async inviteCodeForAgent(publicKeyB64: string) {
    if (this.data.privacy === Privacy.Public) {
      return this.publicInviteCode
    }
    const proof = await this.relayStore.inviteAgentToConversation(this.data.id, decodeHashFromBase64(publicKeyB64))
    if (proof !== undefined) {
      // The name of the conversation we are inviting to should be our name + # of other people invited
      let myProfile = get(this.client.profilesStore.myProfile)
      const profileData = myProfile.status === 'complete' ? myProfile.value?.entry : undefined
      let title = (profileData?.fields.firstName || '') + ' ' + profileData?.fields.lastName
      if (this.invitedContactKeys.length > 1) {
        title = `${title} + ${this.invitedContactKeys.length - 1}`
      }

      const invitation: Invitation = {
        created: this.created, // TODO: put in data
        progenitor: this.data.progenitor,
        privacy: this.data.privacy,
        proof,
        networkSeed: this.data.id,
        title
      }
      const msgpck = encode(invitation);
      return Base64.fromUint8Array(msgpck);
    } else {
      alert(get(t)('conversations.unable_to_create_code'))
      return Promise.resolve('')
    }
  }

  get invitedContactKeys() : string[] {
    if (this.data.privacy === Privacy.Public) return []
    const currentValue = get(this.localDataStore).invitedContactKeys
    return isEmpty(currentValue) ? [] : currentValue
  }

  get invitedContacts() {
    const contacts = get(this.relayStore.contacts)
    return this.invitedContactKeys.map(contactKey => contacts.find(contact => contact.publicKeyB64 === contactKey))
  }

  get archived() {
    return get(this.localDataStore).archived
  }

  get open() {
    return get(this.localDataStore).open
  }

  get unread() {
    return get(this.localDataStore).unread
  }

  get allMembers() {
    return this.memberList(true)
  }

  memberList(includeInvited = false) {
    // return the list of agents that have joined the conversation, checking the relayStore for contacts and using the contact info first and if that doesn't exist using the agent profile
    const joinedAgents = this.data.agentProfiles
    const contacts = get(this.relayStore.contacts)

    const keys = uniq(Object.keys(joinedAgents).concat(includeInvited ? this.invitedContactKeys : []))

    // Filter out progenitor, as they are always in the list,
    // use contact data for each agent if it exists locally, otherwise use their profile
    // sort by first name (for now)
    return keys.filter(k => k !== this.client.myPubKeyB64).map(agentKey => {
      const agentProfile = joinedAgents[agentKey]
      const contactProfile = contacts.find(contact => contact.publicKeyB64 === agentKey);

      return {
        publicKeyB64: agentKey,
        avatar: contactProfile?.data.avatar || agentProfile?.fields.avatar,
        firstName: contactProfile?.data.firstName || agentProfile?.fields.firstName,
        lastName: contactProfile?.data.firstName ? contactProfile?.data.lastName : agentProfile?.fields.lastName, // if any contact profile exists use that data
      }
    }).sort((a, b) => a.firstName.localeCompare(b.firstName))
  }

  get invitedUnjoined() {
    const joinedAgents = this.data.agentProfiles
    const contacts = get(this.relayStore.contacts)
    return this.invitedContactKeys
      .filter(contactKey => !joinedAgents[contactKey]) // filter out already joined agents
      .map(contactKey => {
        const contactProfile = contacts.find(contact => contact.publicKeyB64 === contactKey)

        return {
          publicKeyB64: contactKey,
          avatar: contactProfile?.data.avatar,
          firstName: contactProfile?.data.firstName,
          lastName: contactProfile?.data.lastName,
        }
      })
  }

  get title() {
    // TODO: when invited contacts is stored in HC this can go back to invitedContactKeys
    const numInvited = this.allMembers.length
    if (this.data?.privacy === Privacy.Public) {
      return this.data?.config.title
    }

    if (numInvited === 0) {
      // When joining a private converstion that has not synced yet
      return this.data?.config.title
    } else if (numInvited === 1) {
      // Use full name of the one other person in the chat
      return this.allMembers[0] ? this.allMembers[0].firstName + " " + this.allMembers[0].lastName : this.data?.config.title
    } else if (numInvited === 2) {
      return this.allMembers.map(c => c?.firstName).join(' & ')
    } else {
      return this.allMembers.map(c => c?.firstName).join(', ')
    }
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
        if (this.open == false) {
          this.localDataStore.update(data => ({ ...data, unread: true }))
        }
        bucket.add(missingHashes)
        this.history.saveBucket(b)
      }

      const hashesToLoad: Array<ActionHash> = []
      get(bucket.hashes).forEach(h => {
        if (!newMessages[h]) hashesToLoad.push(decodeHashFromBase64(h))
      })

      if (hashesToLoad.length > 0) {
        const messageRecords: Array<MessageRecord> = await this.client.getMessageEntries(this.data.id, hashesToLoad)
        if (hashesToLoad.length != messageRecords.length) {
          console.log("Warning: not all requested hashes were loaded")
        }
        let lastMessage = get(this.lastMessage)
        for (const messageRecord of messageRecords) {
          try {
            const message = messageRecord.message
            if (message) {
              message.hash = encodeHashToBase64(messageRecord.signed_action.hashed.hash)
              message.timestamp = new Date(messageRecord.signed_action.hashed.content.timestamp / 1000)
              if (!lastMessage || message.timestamp > lastMessage.timestamp) {
                lastMessage = message
              }
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
        this.conversation.update(c => {
          c.messages = {...newMessages}
          return c
        })
        this.lastMessage.set(lastMessage)
        return Object.keys(newMessages)
      }
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

  get lastActivityAt() {
    return derived(this.lastMessage, ($lastMessage) => {
      return $lastMessage ? $lastMessage.timestamp.getTime() : this.created
  })
  }

  /***** Setters & actions ******/

  async sendMessage(authorKey: string, content: string, images: Image[]) {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date()
    const bucket = this.bucketFromDate(now)
    const id = uuidv4()
    const oldMessage: Message = { authorKey, content, hash: id, status: 'pending', timestamp: now, bucket, images}
    this.addMessage(oldMessage)
    // TODO: upload these images asynchonously and then add to the message when done
    const imageStructs = await Promise.all(images.filter(i => !!i.file).map(async (image) => {
      const hash = await this.fileStorageClient.uploadFile(image.file!)
      return {
        last_modified: image.file!.lastModified,
        name: image.file!.name,
        size: image.file!.size,
        storage_entry_hash: hash,
        file_type: image.file!.type
      }
    }))
    const newMessageEntry = await this.client.sendMessage(this.data.id, content, bucket, imageStructs, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)))
    const newMessage: Message = {
      ...oldMessage,
      hash: encodeHashToBase64(newMessageEntry.actionHash),
      status: 'confirmed',
      images: images.map(i => ({ ...i, status: 'loaded' }))
    }
    this.updateMessage(oldMessage, newMessage)
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      message.images = message.images || [];
      const lastMessage = get(this.lastMessage)
      if (!lastMessage || message.timestamp > lastMessage.timestamp) {
        this.lastMessage.set(message)
      }
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });

    if (message.hash.startsWith("uhCkk")) {  // don't add placeholder to bucket yet.
      this.history.add(message)
      if (!this.open && message.authorKey !== this.client.myPubKeyB64) {
        this.localDataStore.update(data => ({ ...data, unread: true }))
      }
    }
  }

  updateMessage(oldMessage: Message, newMessage: Message): void {
    this.conversation.update(conversation => {
      const messages = {...conversation.messages}
      delete messages[oldMessage.hash]
      return { ...conversation, messages: {...messages, [newMessage.hash]: newMessage } };
    })
    this.history.add(newMessage)
  }

  async loadImagesForMessage(message: Message, tryCount: number = 0) {
    if (message.images && message.images.length > 0) {
      // We have to load them all and then update the message otherwise the various updates overwrite each other
      for (const image of message.images) {
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

        const file = await this.fileStorageClient.downloadFile(image.storageEntryHash)

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
          console.error("Coulnd't find image after 10 retries", image)
          resolve({ ...image, status: 'error', dataURL: ''})
        }
      }
    })
  }

  async updateConfig(config: Config) {
    const cellAndConfig = this.relayStore.client.conversations[this.id]
    await this.relayStore.client._setConfig(config, cellAndConfig.cell.cell_id)
    this.conversation.update(conversation => ({ ...conversation, config }))
  }

  // Invite more contacts to this private conversation
  addContacts(invitedContacts: Contact[]) {
    this.localDataStore.update(data => ({
      ...data,
      invitedContactKeys: this.invitedContactKeys.concat(invitedContacts.map(c => c.publicKeyB64))
    }))
  }

  setArchived(archived = true) {
    this.localDataStore.update(data => ({ ...data, archived }))
  }

  setOpen(open: boolean) {
    this.localDataStore.update(data => ({ ...data, open }))
  }

  setUnread(unread: boolean) {
    this.localDataStore.update(data => ({ ...data, unread }))
  }
}
