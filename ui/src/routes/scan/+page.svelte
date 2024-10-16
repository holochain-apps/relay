<script lang="ts">
  import { scan, cancel, checkPermissions, requestPermissions, Format } from '@tauri-apps/plugin-barcode-scanner'
  import Button from '$lib/Button.svelte';
  import { t } from '$lib/translations';
  import { scanStore } from '$store/ScanStore';
  import { setBackgroundColor } from '$lib/background';
  
  let needsPermission = false;

  $: isSupported = scanStore.isSupported;

  async function ensurePermissions() {
    const permissionsState = await checkPermissions();
    if(permissionsState === "prompt") {
      try {
        await requestPermissions();
      } catch(e) {
        console.error(e);
        needsPermission = true;
      }
    } else {
      needsPermission = true;
    }
  }

  async function executeScan() {
    try {
      const res = await scan({ windowed: true, formats: [Format.QRCode] });
      scanSuccess(res.content);
    } catch (e) {
      console.error(e);
    }
  }
  
  function scanSuccess(value: string) {
    scanStore.value.set(value);
    resetBackgroundColor();
    scanStore.complete();
  }

    
  async function scanCancel() {
    try {
      await cancel();
    } catch(e) {
      console.error(e);
    }

    resetBackgroundColor();
    scanStore.complete();
  }

  async function load() {
    await ensurePermissions();
    await executeScan();
  }

  load();
  let resetBackgroundColor = setBackgroundColor('transparent');
</script>

{#if $isSupported}
  <div class="z-10 fixed top-0 left-0 w-screen h-screen text-black">
    <div class="flex flex-col w-screen h-screen justify-center items-center">
      
      <!-- Scanning Area -->
      <div class="w-64 h-64 border-solid border-white border-2 rounded-lg shadow-full"></div>

      <!-- Action Buttons -->
      <div class="my-8">
        <Button
          moreClasses='w-36 justify-center !variant-filled-tertiary dark:!variant-filled-secondary'
          onClick={() => scanCancel()}
        >
          <strong>{$t('common.cancel')}</strong>
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .shadow-full {
    box-shadow: 0 0 0 100vh rgba(0,0,0, 0.7);
  }
</style>
