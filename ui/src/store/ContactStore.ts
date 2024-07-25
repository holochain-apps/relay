import { encode } from '@msgpack/msgpack';
import { Base64 } from 'js-base64';
import { type AgentPubKey, type DnaHash, decodeHashFromBase64, encodeHashToBase64, type EntryHash } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { RelayClient } from '$store/RelayClient'
import { type Config, type Contact, type Image, type Invitation, type Message, type MessageRecord, Privacy } from '../types';

export class ContactStore {
  private contact: Writable<Contact>;

  constructor(
    public client: RelayClient,
    public avatar: string,
    public firstName: string,
    public lastName: string,
    public publicKey: AgentPubKey,
  ) {
    this.contact = writable({ avatar, firstName, lastName, publicKey });
  }

  get data() {
    return get(this.contact);
  }

  subscribe(run: any) {
    return this.contact.subscribe(run);
  }

  // async getContact() {
  //   const contact = await this.client.getContact(this.data.publicKey)
  //   if (contact) {
  //     this.contact.update(c => {
  //       c = {...c, ...contact}
  //       return c
  //     })
  //     return contact
  //   }
  //   return null
  // }
}
