<script lang="ts">
  import { scan, cancel, checkPermissions, requestPermissions, openAppSettings,  Format } from '@tauri-apps/plugin-barcode-scanner'
  import Button from '$lib/Button.svelte';
  import { t } from '$lib/translations';
  import { scanStore } from '$store/ScanStore';
  import { setBackgroundColor } from '$lib/background';
  import { onDestroy } from 'svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';

  let needsPermission = false;

  $: isSupported = scanStore.isSupported;

  async function ensurePermissions() {
    let permissionsState = await checkPermissions();
    if(permissionsState === "granted") return;

    try {
      permissionsState = await requestPermissions();
      if(permissionsState === "granted") return;
    } catch(e) {
      console.error('requestPermissions error', e);
    }

    needsPermission = true;
  }

  async function executeScan() {
    try {
      const res = await scan({ windowed: true, formats: [Format.QRCode] });
      scanSuccess(res.content);
    } catch (e) {
      console.error('executeScan error', e);
    }
  }
  
  function scanSuccess(value: string) {
    scanStore.value.set(value);
    scanStore.complete();
  }

    
  async function scanCancel() {
    try {
      await cancel();
    } catch(e) {
      console.error(e);
    }
    scanStore.complete();
  }

  async function load() {
    await ensurePermissions();
    await executeScan();
  }


  load();

  // tauri-plugin-barcode-scanner is launched in its own View BEHIND the current webview
  // Thus we must set the body background color to transparent for this page only,
  // to expose the View behind it.
  let resetBackgroundColor = setBackgroundColor('transparent');
  onDestroy(() => {
    resetBackgroundColor();
  });
</script>

{#if $isSupported}
  <div class="z-10 fixed top-0 left-0 w-screen h-screen text-black">
    <div class="flex flex-col w-screen h-screen justify-center items-center">
      
      <!-- Scanning Area -->
      <div class="w-64 h-64 border-solid border-white border-2 rounded-lg shadow-full">
        {#if needsPermission}
          <div class="h-full w-full flex justify-center items-center">
            <SvgIcon icon='warning' color="%232e2e2e" size='120' />
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      {#if needsPermission}
        <div class="mt-4">
          <p class='text-error-500 text-sm mt-2'>{$t('conversations.need_camera_permissions')}</p>
        </div>
      {/if}

      <div class="my-8 flex justify-center items-center space-x-4">
        <Button
          moreClasses='w-36 justify-center !variant-filled-tertiary dark:!variant-filled-secondary'
          onClick={() => scanCancel()}
        >
          <strong>{$t('common.cancel')}</strong>
        </Button>

        {#if needsPermission}
          <Button
            moreClasses='w-36 justify-center !variant-filled-tertiary dark:!variant-filled-secondary'
            onClick={() => {
              scanCancel();
              openAppSettings();
            }}
          >
            <strong>{$t('conversations.open_app_settings')}</strong>
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .shadow-full {
    box-shadow: 0 0 0 100vh rgba(0,0,0, 0.7);
  }
</style>
