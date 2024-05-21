import { type AgentPubKey, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { RelayClient } from '$store/RelayClient'
import type { Conversation, MessageRecord } from '../types';

export class ConversationStore {
  private conversation: Writable<Conversation>;

  constructor( public client: RelayClient, id: string, name: string, public progenitor: AgentPubKey|undefined) {
    console.log("new onversation store", id, name, progenitor)
    this.conversation = writable({ id, name, messages: [], progenitor });
  }

  async initialize() {
    // await this.getMyNickname()
    //await this.getNicknames()
    //await this.getNavigators()
    //await this.getSidekicks()
    //await this.getResources()
    await this.getMessages()
  }

  get data() {
    return get(this.conversation);
  }

  subscribe(run: any) {
    return this.conversation.subscribe(run);
  }

  async getMessages() {
    try {
      //const messages: Array<MessageRecord> = await this.client.getMessagesByWeek()
      const messages: Array<MessageRecord> = await this.client.getAllMessages(this.data.id)
      console.log("getMessages returned", messages)
      for (const messageRecord of messages) {
        try {
          const message = messageRecord.message
          if (message) {
            // const text = JSON.parse(message.text)
            // const resource: Resource = {
            //   type: r.type,
            //   details: JSON.parse(r.details), //json blob
            //   sidekick: decodeHashFromBase64(r.sidekick)
            // }
            // TODO validate that we actually got a resource
            message.id = encodeHashToBase64(messageRecord.original_action)
            message.timestamp = new Date(messageRecord.signed_action.hashed.content.timestamp / 1000)
            this.conversation.update(c => {
              c.messages = [...c.messages, message]
              return c
            })
          }
        } catch(e) {
          console.log("Unable to parse message, ignoring", messageRecord, e)
        }
      }
    } catch (e) {
      //@ts-ignore
      console.log("Error getting messages", e)
    }
  }

  addMessage(author: string, content: string): void {
    console.log("addMessage", content)
    this.conversation.update(conversation => {
      const message = { id: String(conversation.messages.length + 1), author, content, timestamp: new Date() };
      return { ...conversation, messages: [...conversation.messages, message] };
    });
    const message = this.client.sendMessage(this.data.id, content, []);
    console.log("addMessage complete", message)
  }
}
