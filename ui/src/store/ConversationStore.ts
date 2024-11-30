import { isEmpty, uniq } from "lodash-es";
import { encode } from "@msgpack/msgpack";
import { Base64 } from "js-base64";
import {
  type AgentPubKey,
  type CellId,
  decodeHashFromBase64,
  encodeHashToBase64,
  type ActionHash,
  type AgentPubKeyB64,
} from "@holochain/client";
import { FileStorageClient } from "@holochain-open-dev/file-storage";
import { derived, get, writable, type Writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { t } from "$lib/translations";
import { RelayStore } from "$store/RelayStore";
import {
  type Config,
  type Contact,
  type Conversation,
  type Image,
  type Invitation,
  type LocalConversationStatus,
  type Message,
  type MessageRecord,
  Privacy,
  type Messages,
} from "../types";
import { ConversationHistoryStore } from "./ConversationHistoryStore";
import pRetry from "p-retry";
import { copyToClipboard, fileToDataUrl, shareText } from "$lib/utils";
import { persisted, type Persisted } from "@square/svelte-store";
import toast from "svelte-french-toast";
import { page } from "$app/stores";

// Timestamp range of actions contained within a single bucket, in milliseconds
export const BUCKET_RANGE_MS = 1000 * 60 * 60 * 24; // 1 day

// Target number of messages to load in a single request for additional message history
export const TARGET_MESSAGES_COUNT = 20;

export class ConversationStore {
  public conversation: Writable<Conversation>;
  public history: ConversationHistoryStore;
  public status: Persisted<LocalConversationStatus>;
  public oldestBucketIndexLoaded: number | undefined;
  public lastMessage: Writable<Message | null>;
  private fileStorageClient: FileStorageClient;

  constructor(
    public relayStore: RelayStore,
    public id: string,
    public cellId: CellId,
    public config: Config,
    public created: number,
    public privacy: Privacy,
    public progenitor: AgentPubKey,
  ) {
    const messages: Messages = {};

    this.history = new ConversationHistoryStore(encodeHashToBase64(this.cellId[0]), this.currentBucketIndex());

    this.conversation = writable({
      id,
      cellId,
      config,
      privacy,
      progenitor,
      agentProfiles: {},
      messages,
    });
    this.status = persisted<LocalConversationStatus>(
      { archived: false, invitedContactKeys: [], open: false, unread: false },
      `CONVERSATION.${this.data.id}.STATUS`,
    );
    this.lastMessage = writable(null);
    this.fileStorageClient = new FileStorageClient(
      this.relayStore.client.client,
      "UNUSED ROLE NAME", // this is not used when cellId is specified, but the FileStorageClient still requires the parameter
      "file_storage",
      cellId,
    );
  }

  async initialize() {
    await this.loadAgents();
    await this.loadMessagesCurrentPage();
  }

  /**
   * Load the page of messages for the current time
   */
  async loadMessagesCurrentPage() {
    await this.loadMessageSetFrom(this.currentBucketIndex());
  }

  /**
   * Load the most recent page of messages that has not already been loaded
   */
  async loadMessagesLatestPage() {
    await this.loadMessageSetFrom(this.oldestBucketIndexLoaded ? this.oldestBucketIndexLoaded : this.currentBucketIndex());
  }

  // looks in the history starting at a bucket number for hashes, and retrieves all
  // the actual messages in that bucket as well as any earlier buckets necessary
  // such that at least TARGET_MESSAGES_COUNT messages.
  async loadMessageSetFrom(bucketIndex: number): Promise<number | undefined> {
    const bucketIndexes = this.history.getBucketsForMessageCount(TARGET_MESSAGES_COUNT, bucketIndex);

    if(bucketIndexes.length === 0) return undefined;

    await Promise.allSettled(bucketIndexes.map((i) => this.loadMessagesForBucket(i)));

    this.oldestBucketIndexLoaded = bucketIndex - bucketIndexes.length + 1;
  }

  async loadAgents() {
    const agentProfiles = await this.relayStore.client.getAllAgents(this.data.id);
    this.conversation.update((c) => {
      c.agentProfiles = { ...agentProfiles };
      return c;
    });
    return agentProfiles;
  }

  subscribe(run: any) {
    return this.conversation.subscribe(run);
  }

  /****** Getters ******/
  get data() {
    return get(this.conversation);
  }

  /**
   * Public joining code for a conversation
   */
  get publicInviteCode() {
    if(this.data.privacy !== Privacy.Public) throw new Error("Cannot generate public invite code for private conversation");

    return Base64.fromUint8Array(
      encode({
        created: this.created,
        networkSeed: this.data.id,
        privacy: this.data.privacy,
        progenitor: this.data.progenitor,
        title: this.title,
      } as Invitation)
    );
  }

  private async makeInviteCodeForAgent(publicKeyB64: string) {
    if (this.data.privacy === Privacy.Public) return this.publicInviteCode;

      const membraneProof = await this.relayStore.client.generateMembraneProofForAgent(
        this.data.id,
        decodeHashFromBase64(publicKeyB64),
      );

      // The name of the conversation we are inviting to should be our name + # of other people invited
      let myProfile = get(this.relayStore.client.profilesStore.myProfile);
      const profileData =
        myProfile.status === "complete" ? myProfile.value?.entry : undefined;
      let title =
        (profileData?.fields.firstName || "") +
        " " +
        profileData?.fields.lastName;
      if (this.invitedContactKeys.length > 1) {
        title = `${title} + ${this.invitedContactKeys.length - 1}`;
      }

      return Base64.fromUint8Array(
        encode({
          created: this.created,
          progenitor: this.data.progenitor,
          privacy: this.data.privacy,
          proof: membraneProof,
          networkSeed: this.data.id,
          title,
        } as Invitation)
      );
  }

  async shareInviteCodeForAgent(publicKeyB64: AgentPubKeyB64) {
    try {
      const code = await this.makeInviteCodeForAgent(publicKeyB64);
      shareText(code);
    } catch(e) {
      console.error("Failed to makeInviteCodeForAgent", e);
      toast.error(get(t)("conversations.unable_to_create_code"));
    }
  }

  async copyInviteCodeForAgent(publicKeyB64: AgentPubKeyB64) {
    try {
      const code = await this.makeInviteCodeForAgent(publicKeyB64);
      copyToClipboard(code);
    } catch(e) {
      console.error("Failed to makeInviteCodeForAgent", e);
      toast.error(get(t)("conversations.unable_to_create_code"));
    }
  }

  get invitedContactKeys(): string[] {
    if (this.data.privacy === Privacy.Public) return [];
    const currentValue = get(this.status).invitedContactKeys;
    return isEmpty(currentValue) ? [] : currentValue;
  }

  get invitedContacts() {
    const contacts = get(this.relayStore.contacts);
    return this.invitedContactKeys.map((contactKey) =>
      contacts.find((contact) => contact.publicKeyB64 === contactKey),
    );
  }

  get archived() {
    return get(this.status).archived;
  }

  get open() {
    return (
      get(page).url.pathname === `/conversations/${get(this.conversation).id}`
    );
  }

  get unread() {
    return get(this.status).unread;
  }

  get allMembers() {
    return this.memberList(true);
  }

  /**
   * return the list of agents that have joined the conversation, 
   * checking the relayStore for contacts and using the contact info first 
   * and if that doesn't exist using the agent profile
   *
   * @param includeInvited 
   * @returns 
   */
  memberList(includeInvited = false) {
    const joinedAgents = this.data.agentProfiles;
    const contacts = get(this.relayStore.contacts);

    let agentPubKeysB64 = Object.keys(joinedAgents);
    if(includeInvited) {
      agentPubKeysB64 = uniq([...agentPubKeysB64, ...this.invitedContactKeys]);
    }

    // Filter out progenitor, as they are always in the list,
    // use contact data for each agent if it exists locally, otherwise use their profile
    // sort by first name (for now)
    return agentPubKeysB64
      .filter((k) => k !== this.relayStore.client.myPubKeyB64)
      .map((agentKey) => {
        const agentProfile = joinedAgents[agentKey];
        const contactProfile = contacts.find((contact) => contact.publicKeyB64 === agentKey);

        return {
          publicKeyB64: agentKey,
          avatar: contactProfile?.data.avatar || agentProfile?.fields.avatar,
          firstName: contactProfile?.data.firstName || agentProfile?.fields.firstName,
          lastName: contactProfile?.data.firstName
            ? contactProfile?.data.lastName
            : agentProfile?.fields.lastName, // if any contact profile exists use that data
        };
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }

  get invitedUnjoined() {
    const joinedAgents = this.data.agentProfiles;
    const contacts = get(this.relayStore.contacts);
    return this.invitedContactKeys
      .filter((contactKey) => !joinedAgents[contactKey]) // filter out already joined agents
      .map((contactKey) => {
        const contactProfile = contacts.find((contact) => contact.publicKeyB64 === contactKey);

        return {
          publicKeyB64: contactKey,
          avatar: contactProfile?.data.avatar,
          firstName: contactProfile?.data.firstName,
          lastName: contactProfile?.data.lastName,
        };
      });
  }

  get title() {
    const numInvited = this.allMembers.length;
    if (this.data?.privacy === Privacy.Public) {
      return this.data?.config.title;
    }

    if (numInvited === 0) {
      // When joining a private converstion that has not synced yet
      return this.data?.config.title;
    } else if (numInvited === 1) {
      // Use full name of the one other person in the chat
      return this.allMembers[0]
        ? this.allMembers[0].firstName + " " + this.allMembers[0].lastName
        : this.data?.config.title;
    } else if (numInvited === 2) {
      return this.allMembers.map((c) => c?.firstName).join(" & ");
    } else {
      return this.allMembers.map((c) => c?.firstName).join(", ");
    }
  }

  async getConfig() {
    const config = await this.relayStore.client._getConfig(this.data.id);
    if (config) {
      this.conversation.update((c) => {
        c.config = { ...config.entry };
        return c;
      });
      return config.entry;
    }
    return null;
  }

  async loadMessagesForBucket(b: number) {
    try {
      const newMessages: { [key: string]: Message } = this.data.messages;
      let bucket = this.history.getBucket(b);
      const count = bucket.count;
      const messageHashes = await this.relayStore.client.getMessageHashes(
        this.data.id,
        b,
        count,
      );

      const messageHashesB64 = messageHashes.map((h) => encodeHashToBase64(h));
      const missingHashes = bucket.missingHashes(messageHashesB64);
      if (missingHashes.length > 0) {
        this.markAsUnread();
        bucket.add(missingHashes);
      }

      const hashesToLoad: Array<ActionHash> = [];
      get(bucket.hashes).forEach((h) => {
        if (!newMessages[h]) hashesToLoad.push(decodeHashFromBase64(h));
      });

      if (hashesToLoad.length > 0) {
        const messageRecords: Array<MessageRecord> =
          await this.relayStore.client.getMessageEntries(this.data.id, hashesToLoad);
        if (hashesToLoad.length != messageRecords.length) {
          console.log("Warning: not all requested hashes were loaded");
        }
        let lastMessage = get(this.lastMessage);
        for (const messageRecord of messageRecords) {
          try {
            const message = messageRecord.message;
            if (message) {
              message.hash = encodeHashToBase64(messageRecord.signed_action.hashed.hash);
              message.timestamp = new Date(
                messageRecord.signed_action.hashed.content.timestamp / 1000,
              );
              if (!lastMessage || message.timestamp > lastMessage.timestamp) {
                lastMessage = message;
              }
              message.authorKey = encodeHashToBase64(
                messageRecord.signed_action.hashed.content.author,
              );
              message.images = ((message.images as any[]) || []).map((i) => ({
                fileType: i.file_type,
                lastModified: i.last_modified,
                name: i.name,
                size: i.size,
                storageEntryHash: i.storage_entry_hash,
                status: "loading",
              }));
              message.status = "confirmed";

              // Async load the images
              this.loadImagesForMessage(message);

              if (!newMessages[message.hash]) {
                const matchesPending = Object.values(this.data.messages).find(
                  (m) =>
                    m.status === "pending" &&
                    m.authorKey === message.authorKey &&
                    m.content === message.content,
                );
                if (matchesPending) {
                  delete newMessages[matchesPending.hash];
                }
                newMessages[message.hash] = message;
              }
            }
          } catch (e) {
            console.error("Unable to parse message, ignoring", messageRecord, e);
          }
        }
        this.conversation.update((c) => {
          c.messages = { ...newMessages };
          return c;
        });
        this.lastMessage.set(lastMessage);
        return Object.keys(newMessages);
      }
    } catch (e) {
      //@ts-ignore
      console.error("Error getting messages", e);
    }
    return [];
  }

  bucketFromTimestamp(timestamp: number): number {
    const diff = timestamp - this.created;
    return Math.round(diff / BUCKET_RANGE_MS);
  }

  bucketFromDate(date: Date): number {
    return this.bucketFromTimestamp(date.getTime());
  }

  currentBucketIndex(): number {
    return this.bucketFromDate(new Date());
  }

  get lastActivityAt() {
    return derived(this.lastMessage, ($lastMessage) => {
      return $lastMessage ? $lastMessage.timestamp.getTime() : this.created;
    });
  }

  /***** Setters & actions ******/

  async sendMessage(authorKey: string, content: string, images: Image[]) {
    // Use temporary uuid as the hash until we get the real one back from the network
    const now = new Date();
    const bucket = this.bucketFromDate(now);
    const id = uuidv4();
    const oldMessage: Message = {
      authorKey,
      content,
      hash: id,
      status: "pending",
      timestamp: now,
      bucket,
      images,
    };
    this.addMessage(oldMessage);
    const imageStructs = await Promise.all(
      images
        .filter((i) => !!i.file)
        .map(async (image) => {
          const hash = await this.fileStorageClient.uploadFile(image.file!);
          return {
            last_modified: image.file!.lastModified,
            name: image.file!.name,
            size: image.file!.size,
            storage_entry_hash: hash,
            file_type: image.file!.type,
          };
        }),
    );
    const newMessageEntry = await this.relayStore.client.sendMessage(
      this.data.id,
      content,
      bucket,
      imageStructs,
      Object.keys(this.data.agentProfiles).map((k) => decodeHashFromBase64(k)),
    );
    const newMessage: Message = {
      ...oldMessage,
      hash: encodeHashToBase64(newMessageEntry.actionHash),
      status: "confirmed",
      images: images.map((i) => ({ ...i, status: "loaded" })),
    };
    this.updateMessage(oldMessage, newMessage);
  }

  addMessage(message: Message): void {
    this.conversation.update((conversation) => {
      message.images = message.images || [];
      const lastMessage = get(this.lastMessage);
      if (!lastMessage || message.timestamp > lastMessage.timestamp) {
        this.lastMessage.set(message);
      }
      return { ...conversation, messages: { ...conversation.messages, [message.hash]: message } };
    });

    // don't add placeholder to bucket yet.
    if (message.hash.startsWith("uhCkk")) {
      this.history.add(message);
      if (message.authorKey !== this.relayStore.client.myPubKeyB64) {
        this.markAsUnread();
      }
    }
  }

  updateMessage(oldMessage: Message, newMessage: Message): void {
    this.conversation.update((conversation) => {
      const messages = { ...conversation.messages };
      delete messages[oldMessage.hash];
      return { ...conversation, messages: { ...messages, [newMessage.hash]: newMessage } };
    });
    this.history.add(newMessage);
  }

  async loadImagesForMessage(message: Message) {
    if (message.images?.length === 0) return;

    const images = await Promise.all(message.images.map((image) => this.loadImage(image)));
    this.conversation.update((conversation) => {
      conversation.messages[message.hash].images = images;
      return conversation;
    });
  }

  async loadImage(image: Image): Promise<Image> {
    try {
      if (image.status === "loaded") return image;
      if (image.storageEntryHash === undefined) return image;

      // Download image file, retrying up to 10 times if download fails
      const file = await pRetry(
        () => this.fileStorageClient.downloadFile(image.storageEntryHash as Uint8Array),
        {
          retries: 10,
          minTimeout: 1000,
          factor: 2,
          onFailedAttempt: (e) => {
            console.error(
              `Failed to download file from hash ${encodeHashToBase64(image.storageEntryHash as Uint8Array)}`,
              e,
            );
          },
        },
      );

      // Convert image blob to data url
      const dataURL = await fileToDataUrl(file);

      return { ...image, status: "loaded", dataURL } as Image;
    } catch (e) {
      console.error("Error loading image after 10 retries:", e);
      return { ...image, status: "error", dataURL: "" } as Image;
    }
  }

  async updateConfig(config: Config) {
    const cellAndConfig = this.relayStore.client.conversations[this.id];
    await this.relayStore.client._setConfig(config, cellAndConfig.cell.cell_id);
    this.conversation.update((conversation) => ({ ...conversation, config }));
  }

  // Invite more contacts to this private conversation
  addContacts(invitedContacts: Contact[]) {
    this.status.update((data) => ({
      ...data,
      invitedContactKeys: this.invitedContactKeys.concat(
        invitedContacts.map((c) => c.publicKeyB64),
      ),
    }));
  }

  toggleArchived() {
    return this.status.update((data) => ({ ...data, archived: !data.archived }));
  }

  markAsRead() {
    this.status.update((data) => ({ ...data, unread: false }));
  }

  markAsUnread() {
    // Only mark conversation as unread if user is *not* currently viewing conversation
    if (this.open) return;

    this.status.update((data) => ({ ...data, unread: true }));
  }
}
