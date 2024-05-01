import { CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, fakeDnaHash } from '@holochain/client';



export async function sampleConfig(cell: CallableCell, partialConfig = {}) {
    return {
        ...{
	  title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        },
        ...partialConfig
    };
}

export async function createConfig(cell: CallableCell, config = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "relay",
      fn_name: "create_config",
      payload: config || await sampleConfig(cell),
    });
}



export async function sampleMessage(cell: CallableCell, partialMessage = {}) {
    return {
        ...{
	  text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        },
        ...partialMessage
    };
}

export async function createMessage(cell: CallableCell, message = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "relay",
      fn_name: "create_message",
      payload: message || await sampleMessage(cell),
    });
}

