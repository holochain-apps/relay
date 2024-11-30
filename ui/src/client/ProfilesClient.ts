import {
  encodeHashToBase64,
  type AgentPubKey,
  type AppClient,
  type CellId,
  type AgentPubKeyB64,
  type RoleName,
} from "@holochain/client";
import type { Profile } from "@holochain-open-dev/profiles";

/**
 * A client for the profiles zome.
 *
 * The client in @holochain-open-dev/profiles does not support specifying the target cell by CellId,
 * thus it cannot be used for clone cells.
 *
 * So the functionality is re-implemented here.
 */
export class ProfilesClient {
  constructor(
    public client: AppClient,
    public cellId?: CellId,
    public roleName?: RoleName,
  ) {
    if (!this.cellId && !this.roleName) throw new Error("cellId or roleName must be specified");
  }

  get myPubKey(): AgentPubKey {
    return this.client.myPubKey;
  }

  get myPubKeyB64(): AgentPubKeyB64 {
    return encodeHashToBase64(this.myPubKey);
  }

  create(profile: Profile) {
    return this.client.callZome({
      ...this.cellIdOrRoleName,
      zome_name: "profiles",
      fn_name: "create_profile",
      payload: profile,
    });
  }

  update(profile: Profile) {
    return this.client.callZome({
      ...this.cellIdOrRoleName,
      zome_name: "profiles",
      fn_name: "update_profile",
      payload: profile,
    });
  }

  getAgentsWithProfile(): Promise<AgentPubKey[]> {
    return this.client.callZome({
      ...this.cellIdOrRoleName,
      zome_name: "profiles",
      fn_name: "get_agents_with_profile",
      payload: null,
    });
  }

  getAgentProfile(agentPubKey: AgentPubKey): Promise<Profile> {
    return this.client.callZome({
      ...this.cellIdOrRoleName,
      zome_name: "profiles",
      fn_name: "get_agent_profile",
      payload: agentPubKey,
    });
  }

  private get cellIdOrRoleName(): { cell_id: CellId } | { role_name: RoleName } {
    return this.cellId ? { cell_id: this.cellId } : { role_name: this.roleName as RoleName };
  }
}
