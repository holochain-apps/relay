import { type ActionHash, type AgentPubKeyB64 } from "@holochain/client";
import { writable, get, type Writable } from 'svelte/store';
import { RelayClient } from '$store/RelayClient'
import { type Contact } from '../types';

export class ContactStore {
  private contact: Writable<Contact>;

  constructor(
    public client: RelayClient,
    public avatar: string,
    public currentActionHash: ActionHash | undefined,
    public firstName: string,
    public lastName: string,
    public originalActionHash: ActionHash | undefined,
    public publicKeyB64: AgentPubKeyB64,
  ) {
    this.contact = writable({ avatar, confirmed: false, currentActionHash, firstName, lastName, originalActionHash, publicKeyB64 });
  }

  subscribe(run: any) {
    return this.contact.subscribe(run);
  }

  get data() {
    return get(this.contact);
  }

  get name() {
    return this.data.firstName + ' ' + this.data.lastName
  }

  update(newData: any) {
    this.contact.update(c => {
      return {...c, ...newData}
    })
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
