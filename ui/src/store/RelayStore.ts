import { decode } from '@msgpack/msgpack';
import { isEqual } from 'lodash-es';
import { writable, get, type Subscriber, type Invalidator, type Unsubscriber, type Writable } from 'svelte/store';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type Dna } from "@holochain/client";
import { ConversationStore } from './ConversationStore';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, Invitation, Message, Properties } from '../types';

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
      const properties: Properties = decode(conversation.dna_modifiers.properties) as Properties;
      const progenitor = decodeHashFromBase64(properties.progenitor);
      await this._addConversation(conversation.clone_id, conversation.cell_id[0], conversation.name, progenitor, conversation.dna_modifiers.network_seed);
    }

    this.client.client.on('signal', async (signal)=>{
      console.log("Got Signal:", signal)

      // @ts-ignore
      if (signal.payload.type == "Message") {
          // @ts-ignore
          const conversation = this.getConversationByCellDnaHash(signal.cell_id[0])

          // @ts-ignore
          const payload: Payload = signal.payload
          // @ts-ignore
          const from: AgentPubKey = payload.from
          const message: Message = {
            id: encodeHashToBase64(payload.action.hashed.hash),
            content: payload.content,
            authorKey: encodeHashToBase64(from),
            timestamp: new Date(payload.action.hashed.content.timestamp / 1000)
          }

          if (conversation && message.authorKey !== this.client.myPubKeyB64()) {
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

  async _addConversation(id: string, cellDnaHash: DnaHash, name: string, progenitor: AgentPubKey, networkSeed: string) {
    if (!this.client) return;
    const newConversation = new ConversationStore(this.client, id, cellDnaHash, name, progenitor, networkSeed)
    this.conversations.update(conversations => [...conversations, newConversation])
    await newConversation.initialize()
    return newConversation
  }

  async createConversation(name: string) {
    if (!this.client) return;
    const conversationCell = await this.client.createConversation(name)
    return await this._addConversation(conversationCell.clone_id, conversationCell.cell_id[0], name, this.client.myPubKey(), conversationCell.dna_modifiers.network_seed)
  }

  async joinConversation(invitation: Invitation) {
    if (!this.client) return;
    const conversationCell = await this.client.joinConversation(invitation.conversationName, invitation.progenitor, invitation.proof, invitation.networkSeed)
    return await this._addConversation(conversationCell.clone_id, conversationCell.cell_id[0], invitation.conversationName, invitation.progenitor, invitation.networkSeed)
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
