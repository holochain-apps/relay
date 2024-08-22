import { decode } from '@msgpack/msgpack';
import { isEqual, camelCase, mapKeys } from 'lodash-es';
import { writable, get, type Subscriber, type Invalidator, type Unsubscriber, type Writable } from 'svelte/store';
import { type AgentPubKey, type AgentPubKeyB64, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type Signal, type EntryHash, type AppSignal } from "@holochain/client";
import { ContactStore } from './ContactStore';
import { ConversationStore } from './ConversationStore';
import { RelayClient } from '$store/RelayClient'
import type { Contact, Image, ConversationCellAndConfig, Invitation, Message, Privacy, Properties, RelaySignal } from '../types';
import { enqueueNotification } from '$lib/utils';

export class RelayStore {
  public contacts: Writable<ContactStore[]>;
  public conversations: Writable<ConversationStore[]>;

  constructor(public client: RelayClient) {
    this.contacts = writable([])
    this.conversations = writable([])
  }

  get contactData() {
    return get(this.contacts)
  }

  get conversationsData() {
    return get(this.conversations)
  }

  async initialize() {
    await this.client.initConversations()

    for (const conversation of Object.values(this.client.conversations)) {
      await this._addConversation(conversation)
    }

    await this.fetchAllContacts()

    this.client.client.on('signal', async (signal:AppSignal)=>{
      console.log("Got Signal:", signal)

      const payload: RelaySignal = signal.payload as RelaySignal

      if (payload.type == "Message") {

        const conversation = this.getConversationByCellDnaHash(signal.cell_id[0])

        const from: AgentPubKey = payload.from
        const message: Message = {
          hash: encodeHashToBase64(payload.action.hashed.hash),
          authorKey: encodeHashToBase64(from),
          content: payload.message.content,
          bucket: payload.message.bucket,
          images: payload.message.images.map((i: any) => ({ ...mapKeys(i, (v, k) => camelCase(k)) as Image, status: 'loading'  }) as Image), // convert snake_case to camelCase
          status: 'confirmed',
          timestamp: new Date(payload.action.hashed.content.timestamp / 1000)
        }

        if (conversation /*&& message.authorKey !== this.client.myPubKeyB64*/) {
          const sender = conversation.allMembers.find(m=>m.publicKeyB64 == message.authorKey)
          enqueueNotification(`Message from: ${sender ? sender.firstName+" "+ sender.lastName : message.authorKey}`, message.content.length>50 ? message.content.slice(0,50)+"...":  message.content)
          conversation.addMessage(message)
          conversation.loadImagesForMessage(message) // async load images
        }
        // let messageList = this.expectations.get(message.from)
        // if (messageList) {
        //     if (payload.type == "Ack") {
        //         const idx = messageList.findIndex((created) => created == payload.created)
        //         if (idx >= 0) {
        //             messageList.splice(idx,1)
        //             this.expectations.set(message.from, messageList)
        //         }
        //     }
        //     // we just received a message from someone who we are expecting
        //     // to have acked something but they haven't so we retry to send the message
        //     if (messageList.length > 0) {
        //         const streams = Object.values(get(this.streams))
        //         for (const msgId of messageList) {
        //             for (const stream of streams) {
        //                 const msg = stream.findMessage(msgId)
        //                 if (msg) {
        //                     console.log("Resending", msg)
        //                     await this.client.sendMessage(stream.id, msg.payload, [message.from])
        //                 }
        //             }
        //         }
        //     }
        //}
      }
    })
  }

  async _addConversation(convoCellAndConfig: ConversationCellAndConfig) {
    if (!this.client) return;
    const properties: Properties = decode(convoCellAndConfig.cell.dna_modifiers.properties) as Properties;
    const progenitor = decodeHashFromBase64(properties.progenitor);
    const privacy = properties.privacy
    const seed = convoCellAndConfig.cell.dna_modifiers.network_seed
    const newConversation = new ConversationStore(this, seed, convoCellAndConfig.cell.cell_id[0], convoCellAndConfig.config, properties.created, privacy, progenitor )
    const unsub = newConversation.lastMessage.subscribe(() => {
      // Trigger update to conversations store whenever lastMessage changes
      this.conversations.update((convs) => {
        return [...convs]; // Force reactivity by returning a new array reference
      });
    });

    this.conversations.update(conversations => [...conversations, newConversation])
    await newConversation.initialize()
    return newConversation
  }

  async createConversation(name: string, image: string, privacy: Privacy) {
    if (!this.client) return;
    const convoCellAndConfig = await this.client.createConversation(name, image, privacy)
    return await this._addConversation(convoCellAndConfig)
  }

  async joinConversation(invitation: Invitation) {
    if (!this.client) return;
    const convoCellAndConfig = await this.client.joinConversation(invitation)
    return await this._addConversation(convoCellAndConfig)
  }

  async inviteAgentToConversation(conversationId: string, agent: AgentPubKey, role: number = 0) {
    if (!this.client) return;
    return await this.client.inviteAgentToConversation(conversationId, agent, role)
  }

  // removeConversations(id: string): void {
  //   this.conversations.update(conversations =>
  //     conversations.filter(conversation => conversation.data.id !== id)
  //   );
  // }

  getConversation(id: string): ConversationStore | undefined {
    let foundConversation
    this.conversations.subscribe(conversations => {
      foundConversation = conversations.find(conversation => conversation.data.id === id);
    })();

    return foundConversation;
  }

  getConversationByCellDnaHash(cellDnaHash: DnaHash): ConversationStore | undefined {
    let foundConversation
    this.conversations.subscribe(conversations => {
      foundConversation = conversations.find(conversation => isEqual(conversation.data.cellDnaHash, cellDnaHash));
    })();

    return foundConversation;
  }

  /***** Contacts ******/
  async fetchAllContacts() {
    const contactRecords = await this.client.getAllContacts()
    this.contacts.set(contactRecords.map((contactRecord: any) => {
      const contact = contactRecord.contact
      return new ContactStore(this.client, contact.avatar, contactRecord.signed_action.hashed.hash, contact.first_name, contact.last_name, contactRecord.original_action, encodeHashToBase64(contact.public_key))
    }))
  }

  async createContact(contact: Contact) {
    if (!this.client) return false
    const contactStore = new ContactStore(this.client, contact.avatar, undefined, contact.firstName, contact.lastName, undefined, contact.publicKeyB64)

    // TODO: if adding contact fails we should remove it from the store
    const contactResult = await this.client.createContact(contact)
    if (contactResult) {
      this.contacts.update(contacts => [...contacts, contactStore])
    }
    return contactResult
  }

  async updateContact(contact: Contact) {
    if (!this.client) return false
    const contactResult = await this.client.updateContact(contact)
    const contactStore = new ContactStore(this.client, contact.avatar, contactResult.signed_action.hashed.hash, contact.firstName, contact.lastName, contactResult.original_action, contact.publicKeyB64)
    if (contactResult) {
      this.contacts.update(contacts => [...contacts.filter(c => c.publicKeyB64 !== contact.publicKeyB64), contactStore])
    }
    return contactResult
  }

  getContact(publicKey: AgentPubKeyB64): ContactStore | undefined {
    let foundContact
    this.contacts.subscribe(contacts => {
      foundContact = contacts.find(contact => contact.data.publicKeyB64 === publicKey);
    })();

    return foundContact;
  }
}
