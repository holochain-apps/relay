<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import { ProfilesStore } from "@holochain-open-dev/profiles";
  import { getContext } from "svelte";
  import SvgIcon from "./SvgIcon.svelte";

  const profilesContext: { getStore: () => ProfilesStore } =
    getContext("profiles");
  const store = profilesContext.getStore();

  export let agentPubKey: AgentPubKey;
  export let size = 32;
  export let namePosition = "row";
  export let showAvatar = true;
  export let showNickname = true;
  export let placeholder = false;
  export let disableAvatarPointerEvents = false;

  $: agentPubKey;
  $: agentPubKeyB64 = encodeHashToBase64(agentPubKey);
  $: profile = store.profiles.get(agentPubKey); // TODO: how to look in a specific cell
  $: nickname =
    $profile.status == "complete" && $profile.value
      ? $profile.value.entry.nickname
      : agentPubKeyB64.slice(5, 9) + "...";
</script>

<div class="avatar-{namePosition}" title={showNickname ? "" : nickname}>
  {#if $profile.status == "pending"}
    ...
  {:else if $profile.status == "complete" && $profile.value}
    {#if showAvatar}
      {#if placeholder && !$profile.value.entry.fields.avatar}
        <SvgIcon
          icon="faUser"
          size={`${size}`}
          style="margin-left:5px; margin-right:0px"
          color="white"
        />
      {:else}
        <div class="avatar-container" style="width: {size}px; height: {size}px">
          <img src={$profile.value.entry.fields.avatar} alt="avatar" width={size} height={size} />
        </div>
      {/if}
    {/if}
    {#if showNickname}
      <div class="nickname">{nickname}</div>
    {/if}
  {/if}
</div>

<style lang='scss'>
  .avatar-column {
    align-items: center;
    display: flex;
    flex-direction: column;
  }
  .avatar-row {
    display: inline-flex;
    flex-direction: row;
    justify-content: center;
    position: relative;
    height: 100%;
    align-items: center;
  }
  .avatar-row .nickname {
    margin-left: 0.5em;
  }
  .disable-ptr-events {
    pointer-events: none;
  }

  .avatar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 150px; /* Set the desired width */
    height: 150px; /* Set the desired height */
    overflow: hidden;
    border-radius: 50%; /* Make the container circular */

    img {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Ensure the image covers the container */
    }
  }
</style>
