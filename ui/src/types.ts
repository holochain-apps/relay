import type {
  ActionHash,
  AgentPubKeyB64,
  DnaHash,
  EntryHash,
  SignedActionHashed,
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink,
  MembraneProof,
  ClonedCell
} from '@holochain/client';

import type { Profile } from '@holochain-open-dev/profiles'

export type RelaySignal = {
  type: 'EntryCreated';
  action: SignedActionHashed<Create>;
  app_entry: EntryTypes;
} | {
  type: 'EntryUpdated';
  action: SignedActionHashed<Update>;
  app_entry: EntryTypes;
  original_app_entry: EntryTypes;
} | {
  type: 'EntryDeleted';
  action: SignedActionHashed<Delete>;
  original_app_entry: EntryTypes;
} | {
  type: 'LinkCreated';
  action: SignedActionHashed<CreateLink>;
  link_type: string;
} | {
  type: 'LinkDeleted';
  action: SignedActionHashed<DeleteLink>;
  link_type: string;
};

export enum Privacy {
  Private,
  Public
}

// DNA modifier properties for a conversation
export interface Properties {
  name: string;
  privacy: Privacy;
  progenitor: AgentPubKeyB64;
}

export type EntryTypes =
 | ({ type: 'Message'; } & MessageInput);

 export interface MessageInput {
  content: string;
}

export interface Contact {
  currentActionHash?: ActionHash;
  originalActionHash?: ActionHash;
  avatar: string;
  firstName: string;
  lastName: string;
  publicKeyB64: AgentPubKeyB64;
}

export interface Conversation {
  id: string; // the network seed
  agentProfiles: { [key: AgentPubKeyB64]: Profile };
  cellDnaHash: DnaHash;
  config: Config;
  description?: string;
  messages: { [key: string]: Message };
  privacy: Privacy;
  progenitor: AgentPubKey;
}

export interface MembraneProofData {
  conversation_id: string;
  for_agent: AgentPubKey;
  as_role: number;
}

export interface Invitation {
  conversationName: string;
  networkSeed: string;
  privacy: Privacy;
  progenitor: AgentPubKey;
  proof?: MembraneProof;
}

// TODO: Separate interface for the holochain Image struct
export interface Image {
  dataURL?: string;
  fileType: string;
  file?: File;
  name: string;
  lastModified: number;
  size: number;
  storageEntryHash?: EntryHash;
  status?: 'loading' | 'loaded' | 'pending' | 'error'; // Pending = not yet sent to holochain, loading = loading from holochain, loaded = loaded from holochain, error = failed to load
}

export interface Message {
  hash: string;
  author?: string; // TODO: do we use this?
  authorKey: string;
  avatar?: string; // TODO: do we use this?
  content: string;
  header?: string; // an optional header to display above this message in the conversation
  images: Image[];
  status?: 'pending' | 'confirmed' | 'delivered' | 'read'; // status of the message
  timestamp: Date;
}

export interface MessageRecord {
  original_action: ActionHash;
  signed_action: SignedActionHashed;
  message?: Message;
}

export interface Config {
  title: string,
  image: string,
}

export interface ConversationCellAndConfig {
  cell: ClonedCell,
  config: Config,
}