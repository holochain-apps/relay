import { decode } from "@msgpack/msgpack";
import { isEqual, camelCase, mapKeys } from "lodash-es";
import { writable, get, type Writable, type Subscriber, type Unsubscriber } from "svelte/store";
import {
  type AgentPubKey,
  type AgentPubKeyB64,
  type DnaHash,
  decodeHashFromBase64,
  encodeHashToBase64,
  type Signal,
  SignalType,
} from "@holochain/client";
import { ConversationStore } from "./ConversationStore";
import { RelayClient } from "$store/RelayClient";
import type {
  Contact,
  Image,
  ConversationCellAndConfig,
  Invitation,
  Message,
  Properties,
  RelaySignal,
} from "../types";
import { Privacy } from "../types";
import { enqueueNotification, isMobile } from "$lib/utils";
import { AllContactsStore } from "./AllContactsStore";

export class RelayStore {
  public contacts: AllContactsStore;
  public conversations: Writable<ConversationStore[]>;

  constructor(public client: RelayClient) {
    this.contacts = new AllContactsStore(client);
    this.conversations = writable([]);
  }

  subscribe(run: Subscriber<ConversationStore[]>): Unsubscriber {
    return this.conversations.subscribe(run);
  }

  get conversationsData() {
    return get(this.conversations);
  }

  async initialize() {
    await this.contacts.initialize();

    await this.client.initConversations();

    for (const conversation of Object.values(this.client.conversations)) {
      await this.addConversation(conversation);
    }

    this.client.client.on("signal", async (signal: Signal) => {
      if (!(SignalType.App in signal)) return;

      console.log("Got App Signal:", signal);

      const payload: RelaySignal = signal[SignalType.App].payload as RelaySignal;

      if (payload.type == "Message") {
        const conversation = this.getConversationByCellDnaHash(signal[SignalType.App].cell_id[0]);

        const from: AgentPubKey = payload.from;
        const message: Message = {
          hash: encodeHashToBase64(payload.action.hashed.hash),
          authorKey: encodeHashToBase64(from),
          content: payload.message.content,
          bucket: payload.message.bucket,
          images: payload.message.images.map(
            (i: any) =>
              ({ ...(mapKeys(i, (v, k) => camelCase(k)) as Image), status: "loading" }) as Image,
          ), // convert snake_case to camelCase
          status: "confirmed",
          timestamp: new Date(payload.action.hashed.content.timestamp / 1000),
        };

        if (conversation && message.authorKey !== this.client.myPubKeyB64) {
          const sender = conversation.allMembers.find((m) => m.publicKeyB64 == message.authorKey);
          conversation.addMessage(message);
          if (!conversation.archived) {
            const msgShort =
              message.content.length > 125 ? message.content.slice(0, 50) + "..." : message.content;
            if (isMobile()) {
              enqueueNotification(
                `${sender ? sender.firstName + " " + sender.lastName : message.authorKey}: ${msgShort}`,
                message.content,
              );
            } else {
              enqueueNotification(
                `Message from ${sender ? sender.firstName + " " + sender.lastName : message.authorKey}`,
                message.content,
              );
            }
            conversation.loadImagesForMessage(message); // async load images
          }
        }
      }
    });
  }

  private async addConversation(
    convoCellAndConfig: ConversationCellAndConfig,
  ): Promise<ConversationStore> {
    if (!this.client) throw Error("Client must be initialized");

    const properties: Properties = decode(
      convoCellAndConfig.cell.dna_modifiers.properties,
    ) as Properties;
    const progenitor = decodeHashFromBase64(properties.progenitor);
    const privacy = properties.privacy;
    const seed = convoCellAndConfig.cell.dna_modifiers.network_seed;
    const newConversation = new ConversationStore(
      this,
      seed,
      convoCellAndConfig.cell.cell_id,
      convoCellAndConfig.config,
      properties.created,
      privacy,
      progenitor,
    );

    const unsub = newConversation.lastMessage.subscribe(() => {
      // Trigger update to conversations store whenever lastMessage changes
      this.conversations.update((convs) => {
        return [...convs]; // Force reactivity by returning a new array reference
      });
    });

    const unsub2 = newConversation.status.subscribe(() => {
      // Trigger update to conversations store whenever localDataStore changes
      this.conversations.update((convs) => {
        return [...convs]; // Force reactivity by returning a new array reference
      });
    });

    this.conversations.update((conversations) => [...conversations, newConversation]);

    await newConversation.initialize();

    return newConversation;
  }

  async createConversation(
    title: string,
    image: string,
    privacy: Privacy,
    initialContacts: AgentPubKeyB64[] = [],
  ): Promise<ConversationStore> {
    if (!this.client) throw Error("Client is not initialized");
    const convoCellAndConfig = await this.client.createConversation(title, image, privacy);

    const conversationStore = await this.addConversation(convoCellAndConfig);

    if (initialContacts.length > 0) {
      conversationStore.addContacts(initialContacts);
    }

    return conversationStore;
  }

  async joinConversation(invitation: Invitation) {
    if (!this.client) return null;
    const convoCellAndConfig = await this.client.joinConversation(invitation);
    if (convoCellAndConfig) {
      return await this.addConversation(convoCellAndConfig);
    }
    return null;
  }

  getConversation(id: string): ConversationStore | undefined {
    let foundConversation;
    this.conversations.subscribe((conversations) => {
      foundConversation = conversations.find((conversation) => conversation.data.id === id);
    })();

    return foundConversation;
  }

  private getConversationByCellDnaHash(cellDnaHash: DnaHash): ConversationStore | undefined {
    let foundConversation;
    this.conversations.subscribe((conversations) => {
      foundConversation = conversations.find((conversation) =>
        isEqual(conversation.data.cellId[0], cellDnaHash),
      );
    })();

    return foundConversation;
  }
}
