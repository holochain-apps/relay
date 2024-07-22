import { decode } from '@msgpack/msgpack';
import { isEqual } from 'lodash-es';
import { writable, get, type Subscriber, type Invalidator, type Unsubscriber, type Writable } from 'svelte/store';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type Signal, type AppSignal } from "@holochain/client";
import { ConversationStore } from './ConversationStore';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, ConversationCellAndConfig, Invitation, Message, Privacy, Properties, RelaySignal } from '../types';

export class RelayStore {
  private conversations: Writable<ConversationStore[]>;
  public subscribe: (this: void, run: Subscriber<ConversationStore[]>, invalidate?: Invalidator<ConversationStore[]>) => Unsubscriber;

  constructor(public client: RelayClient) {
    this.conversations = writable([]);
    this.subscribe = this.conversations.subscribe;
  }

  get conversationsData() {
    return get(this.conversations);
  }

  async initialize() {
    await this.client.initConversations();

    for (const conversation of Object.values(this.client.conversations)) {
      await this._addConversation(conversation);
    }

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
          status: 'confirmed',
          timestamp: new Date(payload.action.hashed.content.timestamp / 1000)
        }

        if (conversation /*&& message.authorKey !== this.client.myPubKeyB64*/) {
          conversation.addMessage(message)
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
    const newConversation = new ConversationStore(this.client, seed, convoCellAndConfig.cell.cell_id[0], convoCellAndConfig.config, properties.created, privacy, progenitor )

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
}
