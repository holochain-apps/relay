<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import { ProfilesStore } from "@holochain-open-dev/profiles";
  import { getContext } from "svelte";
  import SvgIcon from "./SvgIcon.svelte";

  const profilesContext: { getStore: () => ProfilesStore } = getContext("profiles");
  const store = profilesContext.getStore();

  export let agentPubKey: AgentPubKey | null = null;
  export let image: string | undefined = undefined; // If image is passed in this will ignore the agentPubKey
  export let size : string | number = '32';
  export let namePosition = "row";
  export let showAvatar = true;
  export let showNickname = true;
  export let placeholder = false;
  export let moreClasses = ''

  $: agentPubKey;
  $: agentPubKeyB64 = agentPubKey && encodeHashToBase64(agentPubKey);
  $: profile = agentPubKey && store.profiles.get(agentPubKey); // TODO: how to look in a specific cell
  $: nickname = $profile && agentPubKeyB64 ?
    ($profile.status == "complete" && $profile.value
      ? $profile.value.entry.nickname
      : agentPubKeyB64.slice(5, 9) + "...") : "";
</script>

<div class="avatar-{namePosition} {moreClasses}" title={showNickname ? "" : nickname}>
  {#if image}
    <div class="avatar-container" style="width: {size}px; height: {size}px">
      <img src={image} alt="avatar" width={size} height={size} />
    </div>
  {:else if $profile && $profile.status == "pending"}
    ...
  {:else if $profile && $profile.status == "complete" && $profile.value}
    {#if showAvatar}
      <div class="avatar-container" style="width: {size}px; height: {size}px">
        {#if placeholder && !$profile.value.entry.fields.avatar}
          <SvgIcon
            icon="person"
            size={`${size}`}
            style="margin-left:5px; margin-right:0px"
            color="white"
          />
        {:else}
          <img src={$profile.value.entry.fields.avatar} alt="avatar" width={size} height={size} />
        {/if}
      </div>
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
