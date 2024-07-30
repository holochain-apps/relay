import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type EntryHash } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import LocalStorageStore from '$store/LocalStorageStore'
import { RelayStore } from '$store/RelayStore'
import { type Config, type Conversation, type Image, type Invitation, type Message, type MessageRecord, Privacy } from '../types';

export class ConversationStore {
  private conversation: Writable<Conversation>;
  private client;

  constructor(
    public relayStore: RelayStore,
    public id: string,
    public cellDnaHash: DnaHash,
    public config: Config,
    public privacy: Privacy,
    public progenitor: AgentPubKey,
  ) {
    this.conversation = writable({ id, cellDnaHash, config, privacy, progenitor, agentProfiles: {}, messages: {} });
    this.client = relayStore.client
  }

  async initialize() {
    await this.getAgents()
    await this.getMessages()
  }

  subscribe(run: any) {
    return this.conversation.subscribe(run);
  }

  get data() {
    return get(this.conversation);
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

  get invitedContactKeys() {
    const localConversationStore = LocalStorageStore<string>(`conversation_${this.data.id}`, JSON.stringify(''))
    return get(localConversationStore).split(',')
  }

  get invitedContacts() {
    const contacts = get(this.relayStore.contacts)
    return this.invitedContactKeys.map(contactKey => contacts.find(contact => contact.publicKeyB64 === contactKey))
  }

  get memberList() {
    // return the list of agents that have joined the conversation, checking the relayStore for contacts and using the contact info first and if that doesn't exist using the agent profile
    const joinedAgents = this.data.agentProfiles
    const contacts = get(this.relayStore.contacts)

    // Filter out progenitor, as they are always in the list,
    // use contact data for each agent if it exists locally, otherwise use their profile
    // sort by first name (for now)
    return Object.keys(joinedAgents).filter(a => a !== encodeHashToBase64(this.data.progenitor)).map(agentKey => {
      const agentProfile = joinedAgents[agentKey]
      const contactProfile = contacts.find(contact => contact.publicKeyB64 === agentKey);

      return {
        publicKey: agentKey,
        avatar: contactProfile?.avatar || agentProfile?.fields.avatar,
        firstName: contactProfile?.firstName || agentProfile?.fields.firstName,
        lastName: contactProfile?.firstName ? contactProfile?.lastName : agentProfile?.fields.lastName, // if any contact profile exists use that data
      }
    }).sort((a, b) => a.firstName.localeCompare(b.firstName))
  }

  get invitedList() {
    const joinedAgents = this.data.agentProfiles
    const contacts = get(this.relayStore.contacts)
    return this.invitedContactKeys
      .filter(contactKey => !joinedAgents[contactKey]) // filter out already joined agents
      .map(contactKey => {
        const contactProfile = contacts.find(contact => contact.publicKeyB64 === contactKey)

        return {
          publicKey: contactKey,
          avatar: contactProfile?.avatar,
          firstName: contactProfile?.firstName,
          lastName: contactProfile?.lastName,
        }
      })
  }

  get title() {
    const numInvited = Object.keys(this.invitedContactKeys).length
    if (this.data.privacy === Privacy.Public) {
      return this.data.config.title
    }

    if (numInvited === 1) {
      // Use full name of the one other person in the chat
      return this.invitedContacts[0]?.name || this.data.config.title
    } else if (numInvited === 2) {
      return this.invitedContacts.map(c => c?.firstName).join(' & ')
    } else {
      return this.invitedContacts.map(c => c?.firstName).join(', ')
    }
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

  async sendMessage(authorKey: string, content: string, images: Image[]) {
    // Use temporary uuid as the hash until we get the real one back from the network
    const oldMessage: Message = { authorKey, content, hash: uuidv4(), status: 'pending', timestamp: new Date(), images }
    this.addMessage(oldMessage)
    const newMessageEntry = await this.client.sendMessage(this.data.id, content, images, Object.keys(this.data.agentProfiles).map(k => decodeHashFromBase64(k)))
    const newMessage: Message = {
      ...oldMessage,
      hash: encodeHashToBase64(newMessageEntry.signed_action.hashed.hash),
      status: 'confirmed',
      images: images.map(i => ({ ...i, status: 'loaded' }))
    }
    this.updateMessage(oldMessage, newMessage)
  }

  addMessage(message: Message): void {
    this.conversation.update(conversation => {
      message.images = message.images || [];
      return { ...conversation, messages: {...conversation.messages, [message.hash]: message } };
    });
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
}
