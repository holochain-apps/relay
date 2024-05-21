import { decode } from '@msgpack/msgpack';
import { writable, get, type Subscriber, type Invalidator, type Unsubscriber, type Writable } from 'svelte/store';
import { type AgentPubKey, decodeHashFromBase64 } from "@holochain/client";
import { ConversationStore } from './ConversationStore';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, Invitation, Properties } from '../types';

export class RelayStore {
  private conversations: Writable<ConversationStore[]>;
  public subscribe: (this: void, run: Subscriber<ConversationStore[]>, invalidate?: Invalidator<ConversationStore[]>) => Unsubscriber;

  constructor(public client: RelayClient) {
    this.conversations = writable([]);
    this.subscribe = this.conversations.subscribe;
  }

  async initialize() {
    await this.client.initConversations()

    for (const conversation of Object.values(this.client.conversations)) {
      console.log("conversation store", conversation)
      const name = conversation.name
      const properties: Properties = decode(conversation.dna_modifiers.properties) as Properties
      const progenitor = properties.progenitor ? decodeHashFromBase64(properties.progenitor) : undefined
      await this._addConversation(conversation.clone_id, name, progenitor)
    }

    this.client.client.on('signal', async (signal)=>{
      console.log("Got Signal:", signal)

      // // @ts-ignore
      // if (signal.type == "Message") {
      //     // @ts-ignore
      //     const from: AgentPubKey = signal.from
      //     // @ts-ignore
      //     const streamId = signal.stream_id
      //     // @ts-ignore
      //     const payload: Payload = JSON.parse(signal.content)
      //     const message: Message = {
      //         payload,
      //         from,
      //         received: Date.now()
      //     }
      //     this.addMessageToStream(streamId, message)
      //     let messageList = this.expectations.get(message.from)
      //     if (messageList) {
      //         if (payload.type == "Ack") {
      //             const idx = messageList.findIndex((created) => created == payload.created)
      //             if (idx >= 0) {
      //                 messageList.splice(idx,1)
      //                 this.expectations.set(message.from, messageList)
      //             }
      //         }
      //         // we just received a message from someone who we are expecting
      //         // to have acked something but they haven't so we retry to send the message
      //         if (messageList.length > 0) {
      //             const streams = Object.values(get(this.streams))
      //             for (const msgId of messageList) {
      //                 for (const stream of streams) {
      //                     const msg = stream.findMessage(msgId)
      //                     if (msg) {
      //                         console.log("Resending", msg)
      //                         await this.client.sendMessage(stream.id, msg.payload, [message.from])
      //                     }
      //                 }
      //             }
      //         }
      //     }
      // }
    })
  }

  async _addConversation(id: string, name: string, progenitor: AgentPubKey|undefined) {
    if (!this.client) return;

    const newConversation = new ConversationStore(this.client, id, name, progenitor)
    //this.conversations[name] =  newConversation
    this.conversations.update(conversations => [...conversations, newConversation])
    newConversation.initialize()
  }

  // async _addSpace(spaceType: SpaceType, name: string, spaceId: string, progenitor: AgentPubKey|undefined) {
  //   if (!this.client) return;

  //   if (spaceType == SpaceType.Nav) {
  //     const newSpace = new NavSpace(new NavClient(this.client.client, spaceId), progenitor)
  //     this.navSpaces[name] =  newSpace
  //     newSpace.initialize()

  //   } else if (spaceType == SpaceType.Mission) {
  //     const newSpace = new Mission(new BlobClient(this.client.client, spaceId), progenitor)
  //     this.missions[name] =  newSpace
  //     newSpace.initialize()
  //   }

  // },

  async createConversation(nickname: string, name: string) {
    if (!this.client) return;
    const cloneId = await this.client.createConversation(name)
    this._addConversation(cloneId, name, this.client.agentPubKey())
  }

  async joinConversation(invitation: Invitation) {
    if (!this.client) return;
    const cloneId = await this.client.joinConversation(invitation.conversationName, invitation.progenitor, invitation.proof)
    this._addConversation(cloneId, invitation.conversationName, invitation.progenitor)
  }

  // addConversation(name: string): void {
  //   const newConversation = new Conversation(this.client, String(get(this.conversations).length + 1), name);
  //   this.conversations.update(conversations => [...conversations, newConversation]);
  // }

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

    //return get(this.chats).find(chat => chat.data.id === id);
    return foundConversation;
  }
}
