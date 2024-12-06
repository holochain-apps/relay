<script lang="ts">
    import type { Message, MessageAction } from '../types';
    import Button from '$lib/Button.svelte';
    import SvgIcon from '$lib/SvgIcon.svelte';
    import { t } from '$lib/translations';
    import { copyToClipboard } from '$lib/utils';
    
    export let message: Message;
    export let messageHash: string;
    export let downloadImage: (image: any) => Promise<void>;
    export let unselectMessage: () => void;
  
    const messageActions: MessageAction[] = [
      {
        id: 'copy',
        label: $t('conversations.copy_text'),
        icon: 'copy',
        condition: (): boolean => {
          return !!message?.content && message.content.trim() !== '';
        },
        action:() => {
          if (message?.content) {
            copyToClipboard(message.content);
          }
          unselectMessage();
        }
      },
      {
        id: 'download',
        label: $t('conversations.download'),
        icon: 'download',
        condition: () => {
          return message?.images 
            ? message.images.some(img => img.status === 'loaded')
            : false;
        },
        action: async () => {
          if (message?.images) {
            const loadedImages = message.images.filter(img => img.status === 'loaded');
            await Promise.all(loadedImages.map(downloadImage));
          }
          unselectMessage();
        }
      },
      {
        id: 'cancel',
        label: $t('common.cancel'),
        icon: 'x',
        condition: () => true,
        action: () => {
          unselectMessage();
        }
      }
    ];
  </script>
  
  <div 
    class="absolute z-50 w-full flex justify-center items-center"
    style="left: 0;"
  >
    <div class="w-full flex justify-center gap-4 bg-tertiary-500 dark:bg-secondary-500 toolbar-container shadow-lg">
      {#each messageActions as action}
        {#if !action.condition || action.condition(messageHash)}
          <Button 
            onClick={() => action.action(messageHash)}
            moreClasses="flex items-center gap-2 px-4 py-2 rounded-full text-sm variant-filled-tertiary dark:!bg-tertiary-200"
          >
            <SvgIcon 
              icon={action.icon} 
              size="15" 
              color='%23FD3524'
            />
            <span class="text-sm text-black">{action.label}</span>
          </Button>
        {/if}
      {/each}
    </div>
  </div>
  
  <style>
    .toolbar-container {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0.75rem;
      border-bottom-right-radius: 0.75rem;
    }
  </style>