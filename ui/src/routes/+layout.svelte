<script lang="ts">
  import {
    AppWebsocket,
  } from "@holochain/client";
  import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
  import { modeCurrent, setModeCurrent } from "@skeletonlabs/skeleton";
  import { onMount, setContext } from "svelte";
  import { goto } from "$app/navigation";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { RelayClient } from "$store/RelayClient";
  import { RelayStore } from "$store/RelayStore";
  import toast, { Toaster } from "svelte-french-toast";

  import "../app.postcss";

  const ROLE_NAME = "relay";
  const ZOME_NAME = "relay";

  let client: AppWebsocket;
  let relayClient: RelayClient;
  let relayStore: RelayStore;
  let connected = false;
  let profilesStore: ProfilesStore | null = null;

  let appHeight: number;

  function updateAppHeight() {
    appHeight = window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${appHeight}px`);
  }

  async function initHolochain() {
    try {
      console.log("__HC_LAUNCHER_ENV__ is", (window as any).__HC_LAUNCHER_ENV__);
      
      // Connect to holochain
      client = await AppWebsocket.connect({ defaultTimeout: 15000 });

      // Call 'ping' with very long timeout
      // This should be the first zome call after the client connects,
      // as subsequent zome calls will be much faster and can use the default timeout.
      console.log("Awaiting relay cell launch");
      await client.callZome(
        {
          role_name: ROLE_NAME,
          zome_name: ZOME_NAME,
          fn_name: "ping",
          payload: null,
        },

        // 5m timeout
        5 * 60 * 1000,
      );
      console.log("Relay cell ready.");

      // Setup stores
      let profilesClient = new ProfilesClient(client, ROLE_NAME);
      profilesStore = new ProfilesStore(profilesClient);
      relayClient = new RelayClient(client, profilesStore, ROLE_NAME, ZOME_NAME);
      relayStore = new RelayStore(relayClient);
      await relayStore.initialize();

      connected = true;
      console.log("Connected");
    } catch (e) {
      console.error("Failed to init holochain", e);
      toast.error(`${$t("common.holochain_connect_error")}: ${e.message}`);
    }
  }

  onMount(() => {
    // Launch and connect to holochain
    initHolochain();

    // To change from light mode to dark mode based on system settings
    // XXX: not using the built in skeleton autoModeWatcher() because it doesn't set modeCurrent in JS which we use
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    function setMode(value: boolean) {
      const elemHtmlClasses = document.documentElement.classList;
      const classDark = `dark`;
      value === true ? elemHtmlClasses.remove(classDark) : elemHtmlClasses.add(classDark);
      setModeCurrent(value);
    }
    setMode(mql.matches);
    mql.onchange = () => {
      setMode(mql.matches);
    };

    // Prevent internal links from opening in the browser when using Tauri
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Ensure the clicked element is an anchor and has a href attribute
      if (target.closest("a[href]")) {
        // Prevent default action
        event.preventDefault();
        event.stopPropagation();

        const anchor = target.closest("a") as HTMLAnchorElement;
        let link = anchor.getAttribute("href");
        if (
          anchor &&
          anchor.href.startsWith(window.location.origin) &&
          !anchor.getAttribute("rel")?.includes("noopener")
        ) {
          return goto(anchor.pathname); // Navigate internally using SvelteKit's goto
        } else if (anchor && link) {
          // Handle external links using Tauri's API
          if (!link.includes("://")) {
            link = `https://${link}`;
          }
          const { open } = window.__TAURI_PLUGIN_SHELL__;
          open(link);
        }
      }
    };

    setTimeout(updateAppHeight, 300);
    window.addEventListener("resize", updateAppHeight);

    document.addEventListener("click", handleLinkClick);
    return () => {
      document.removeEventListener("click", handleLinkClick);
      window.removeEventListener("resize", updateAppHeight);
    };
  });

  $: prof = profilesStore ? profilesStore.myProfile : undefined;

  setContext("relayClient", {
    getClient: () => relayClient,
  });

  setContext("profiles", {
    getStore: () => profilesStore,
  });

  setContext("relayStore", {
    getStore: () => relayStore,
  });
</script>

<div class="wrapper full-screen mx-auto flex h-screen flex-col items-center px-5 py-4">
  {#if !connected || ($prof && $prof.status === "pending")}
    <div class="flex grow flex-col items-center justify-center">
      <img src="/icon.png" alt="Icon" width="58" class="mb-4" />
      <h1 class="text-2xl font-bold">{$t("common.app_name")}</h1>
      <span class="mt-3 flex text-xs"
        >v{__APP_VERSION__}<SvgIcon
          icon="betaTag"
          size="24"
          moreClasses="ml-1"
          color={$modeCurrent ? "#000" : "#fff"}
        /></span
      >
      <p class="mt-10">{$t("common.tagline")}</p>
    </div>
    <div class="flex flex-col items-center justify-center">
      <p class="mb-8">{$t("common.connecting_to_holochain")}</p>
    </div>
    <div class="flex flex-col items-center justify-center pb-10">
      <p class="mb-2 text-xs">{$t("common.secured_by")}</p>
      <img
        class="max-w-52"
        src={$modeCurrent ? "/holochain-charcoal.png" : "/holochain-white.png"}
        alt="holochain"
      />
    </div>
  {:else}
    <slot />
  {/if}
</div>

<Toaster position="bottom-end" />

<style>
  /* Add this to ensure the page doesn't scroll */
  :global(body) {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: var(--app-background-color);
  }

  .wrapper {
    max-width: 1000px;
    margin: 0 auto;
    height: var(--app-height);
    overflow-y: auto;
  }

  .wrapper.full-screen {
    padding: 0;
  }
</style>
