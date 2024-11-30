import { uniq } from "lodash-es";
import { decode, encode } from "@msgpack/msgpack";
import { Base64 } from "js-base64";
import {
  decodeHashFromBase64,
  encodeHashToBase64,
  type AgentPubKey,
  type AgentPubKeyB64,
} from "@holochain/client";
import { t } from "$lib/translations";
import { type Contact, type Invitation, Privacy } from "../types";
import { copyToClipboard, shareText } from "$lib/utils";
import { asyncReadable, persisted, type Persisted, get } from "@square/svelte-store";
import toast from "svelte-french-toast";
import type { ConversationStore } from "./ConversationStore";
import type { Profile } from "@holochain-open-dev/profiles";

export class ConversationAgentsStore {
  public profiles: { [key: AgentPubKeyB64]: Persisted<Profile | undefined> } = {};
  public invited: Persisted<AgentPubKeyB64[]>;

  constructor(private conversationStore: ConversationStore) {
    this.invited = persisted<AgentPubKeyB64[]>([], `CONVERSATIONS.${conversationStore.id}.INVITED`);
  }

  async initialize() {
    await this.loadAgents();
  }

  async loadAgents() {
    const agentPubKeys: AgentPubKey[] =
      await this.conversationStore.relayStore.client.client.callZome({
        cell_id: this.conversationStore.cellId,
        zome_name: "profiles",
        fn_name: "get_agents_with_profile",
        payload: null,
      });

    const stores = agentPubKeys.map((agentPubKey: AgentPubKey) => {
      // Construct a new asyncReadable for fetching the given agent's Profile
      const profile = asyncReadable(
        undefined,
        async () => {
          // Fetch profile for the given agent
          const record = await this.conversationStore.relayStore.client.client.callZome({
            cell_id: this.conversationStore.cellId,
            zome_name: "profiles",
            fn_name: "get_agent_profile",
            payload: agentPubKey,
          });

          if (record?.entry?.Present?.entry === undefined) return undefined;

          return decode(record.entry.Present.entry) as Profile;
        },
        { reloadable: true },
      );

      // Construct a new persisted store for the given agents Profile
      // This will attempt to fetch the agent Profile if it is not already stored.
      const agentPubKeyB64 = encodeHashToBase64(agentPubKey);
      this.profiles[agentPubKeyB64] = persisted<Profile | undefined>(
        profile,
        `PROFILES.${agentPubKeyB64}`,
      );
    });

    return stores;
  }

  private get invitedContacts() {
    const contacts = get(this.conversationStore.relayStore.contacts);
    return get(this.invited).map((contactKey) =>
      contacts.find((contact) => contact.publicKeyB64 === contactKey),
    );
  }

  get invitedUnjoined() {
    const contacts = get(this.conversationStore.relayStore.contacts);

    return get(this.invited)
      .filter((contactKey) => !get(this.profiles[contactKey])) // filter out already joined agents
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
    const contacts = get(this.conversationStore.relayStore.contacts);

    let agentPubKeysB64 = Object.keys(this.profiles);
    if (includeInvited) {
      agentPubKeysB64 = uniq([...agentPubKeysB64, ...this.invitedContactKeys]);
    }

    // Filter out progenitor, as they are always in the list,
    // use contact data for each agent if it exists locally, otherwise use their profile
    // sort by first name (for now)
    return agentPubKeysB64
      .filter((k) => k !== this.conversationStore.relayStore.client.myPubKeyB64)
      .map((agentKey) => {
        const agentProfile = get(this.profiles[agentKey]);
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

  private async makeInviteCodeForAgent(publicKeyB64: string) {
    if (this.conversationStore.data.privacy === Privacy.Public)
      return this.conversationStore.publicInviteCode;

    const membraneProof =
      await this.conversationStore.relayStore.client.generateMembraneProofForAgent(
        this.conversationStore.id,
        decodeHashFromBase64(publicKeyB64),
      );

    // The name of the conversation we are inviting to should be our name + # of other people invited
    let myProfile = get(this.conversationStore.relayStore.client.profilesStore.myProfile);
    const profileData = myProfile.status === "complete" ? myProfile.value?.entry : undefined;
    let title = (profileData?.fields.firstName || "") + " " + profileData?.fields.lastName;
    if (get(this.invited).length > 1) {
      title = `${title} + ${get(this.invited).length - 1}`;
    }

    return Base64.fromUint8Array(
      encode({
        created: this.conversationStore.created,
        progenitor: this.conversationStore.data.progenitor,
        privacy: this.conversationStore.data.privacy,
        proof: membraneProof,
        networkSeed: this.conversationStore.data.id,
        title,
      } as Invitation),
    );
  }

  async shareInviteCodeForAgent(publicKeyB64: AgentPubKeyB64) {
    try {
      const code = await this.makeInviteCodeForAgent(publicKeyB64);
      await shareText(code);
    } catch (e) {
      console.error("Failed to makeInviteCodeForAgent", e);
      toast.error(get(t)("conversations.unable_to_create_code"));
    }
  }

  async copyInviteCodeForAgent(publicKeyB64: AgentPubKeyB64) {
    try {
      const code = await this.makeInviteCodeForAgent(publicKeyB64);
      await copyToClipboard(code);
    } catch (e) {
      console.error("Failed to makeInviteCodeForAgent", e);
      toast.error(get(t)("conversations.unable_to_create_code"));
    }
  }

  get invitedContactKeys(): string[] {
    if (this.conversationStore.data.privacy === Privacy.Public) return [];
    return get(this.invited);
  }

  // Invite more contacts to this private conversation
  addContacts(invitedContacts: Contact[]) {
    this.invited.update((val) => [...val, ...invitedContacts.map((c) => c.publicKeyB64)]);
  }
}
