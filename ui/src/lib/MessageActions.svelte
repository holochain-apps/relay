<script lang="ts">
  import type { Message, Image } from '../types';
  import Button from '$lib/Button.svelte';
  import SvgIcon from '$lib/SvgIcon.svelte';
  import { t } from '$lib/translations';
  import { copyToClipboard } from '$lib/utils';
  import { save } from '@tauri-apps/plugin-dialog';

  export let message: Message;
  export let unselectMessage: () => void;

  $: hasText = !!message?.content && message.content.trim() !== '';
  $: hasImages = message?.images 
    ? message.images.some(img => img.status === 'loaded')
    : false;

  const downloadImage = async (image: Image) => {
    if (!image || image.status !== 'loaded' || !image.dataURL) {
      console.error('Invalid image for download', image);
      return;
    }
    try {
      const base64Response = await fetch(image.dataURL);
      const blob = await base64Response.blob();
      const savePath = await save({
        title: 'Save Image',
        defaultPath: image.name,
        filters: [{
          name: 'Image',
          extensions: ['png', 'jpg', 'gif']
        }]
      });

      if (savePath) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = savePath;
        link.click();
      }
    }catch (err) {
      console.error('Download failed', err);
    }
  };

  const copy = () => {
    if (message?.content) {
      copyToClipboard(message.content);
    }
    unselectMessage();
  };

  const download = async () => {
    if (message?.images) {
      const loadedImages = message.images.filter(img => img.status === 'loaded');
      await Promise.all(loadedImages.map(downloadImage));
    }
    unselectMessage();
  };

</script>

<div class="absolute z-50 w-full left-0 flex justify-center items-center">
  <div class="w-full flex flex-wrap justify-center gap-1 sm:gap-2 md:gap-4 bg-tertiary-500 dark:bg-secondary-500 rounded-b-xl shadow-lg">
    {#if hasText}
      <Button
        onClick={copy}
        moreClasses="flex items-center gap-1 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm variant-filled-tertiary dark:!bg-tertiary-200"
      >
        <SvgIcon
          icon="copy"
          size="15"
          color='%23FD3524'
          moreClasses="w-3 h-3 sm:w-4 sm:h-4"
        />
        <span class="text-xs sm:text-sm text-black">{$t('conversations.copy_text')}</span>
      </Button>
    {/if}

    {#if hasImages}
      <Button
        onClick={download}
        moreClasses="flex items-center gap-1 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm variant-filled-tertiary dark:!bg-tertiary-200"
      >
        <SvgIcon
          icon="download"
          size="15"
          color='%23FD3524'
          moreClasses="w-3 h-3 sm:w-4 sm:h-4"
        />
        <span class="text-xs sm:text-sm text-black">{$t('conversations.download')}</span>
      </Button>
    {/if}
  </div>
</div>