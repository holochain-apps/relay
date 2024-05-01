import type { AgentPubKey, AppAgentClient, RoleName } from "@holochain/client";
import { EntryRecord, LazyHoloHashMap, ZomeClient } from '@holochain-open-dev/utils';
import type { ActionCommittedSignal } from '@holochain-open-dev/utils';
// import { type Message, Stream, type Payload } from './stream';

const ZOME_NAME = 'relay'

export type Message = {
  created: number,
  text: string
}

export type Payload =
  ({type: 'Message' } & Message) |
  ({type: 'Ack'} & {created: number}) |
  ({type: 'Ping'} & {created: number})

export type EntryTypes = | ({ type: 'Message' } & Message);


// export type SignalMessage = {
//   payload: Payload;
//   from: AgentPubKey;
//   received: number;
// }


export type RelaySignal = ActionCommittedSignal<EntryTypes, any>;


export class RelayClient extends ZomeClient<RelaySignal> {

  constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = ZOME_NAME) {
    super(client, roleName, zomeName);
  }

  async sendMessage(streamId: string, payload: Payload, agents: AgentPubKey[]) {
    await this.callZome('send_message', {
      streamId,
      content: JSON.stringify(payload),
      agents
    })
  }
}