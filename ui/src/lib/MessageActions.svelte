<script lang="ts">
  import type { Message, FileMetadata } from "../types";
  import Button from "$lib/Button.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from "$lib/translations";
  import { convertDataURIToUint8Array, copyToClipboard } from "$lib/utils";
  import { save } from "@tauri-apps/plugin-dialog";
  import { create, writeFile } from "@tauri-apps/plugin-fs";
  import { downloadDir } from "@tauri-apps/api/path";
  import toast from "svelte-french-toast";

  export let message: Message;
  export let unselectMessage: () => void;

  $: hasText = !!message?.content && message.content.trim() !== "";
  $: hasFiles = message?.images ? message.images.some((file) => file.status === "loaded") : false;

  const downloadFile = async (file: FileMetadata) => {
    if (!file || file.status !== "loaded" || !file.dataURL) {
      console.error("Invalid file for download", file);
      return;
    }
    try {
      const defaultDir = await downloadDir();
      const savePath = await save({
        title: "Save File",
        defaultPath: `${defaultDir}/${file.name}`,
      });

      if (!savePath) return;

      try {
        const fileBlob = convertDataURIToUint8Array(file.dataURL);
        await writeFile(savePath, fileBlob, { create: true });
        toast.success($t("common.download_file_success"));
      } catch (e) {
        console.error("Saving file failed", e);
      }
    } catch (e) {
      console.error("Download failed", e);
      toast.error(`${$t("common.download_file_error")}: ${e.message}`);
    }
  };

  const copy = async () => {
    if (message?.content) {
      try {
        await copyToClipboard(message.content);
        toast.success($t("common.copy_success"));
      } catch (e) {
        toast.error(`${$t("common.copy_error")}: ${e.message}`);
      }
    }
    unselectMessage();
  };

  const download = async () => {
    if (message?.images) {
      for (const file of message.images) {
        if (file.status === "loaded") {
          //Downloads only the loaded files sequentially
          await downloadFile(file);
        }
      }
    }
    unselectMessage();
  };
</script>

<div class="absolute left-0 z-50 flex w-full items-center justify-center">
  <div
    class="bg-tertiary-500 dark:bg-secondary-500 flex w-full flex-wrap justify-center gap-1 rounded-b-xl shadow-lg sm:gap-2 md:gap-4"
  >
    {#if hasText}
      <Button
        onClick={copy}
        moreClasses="flex items-center gap-1 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm dark:variant-filled-tertiary bg-tertiary-200"
      >
        <SvgIcon icon="copy" size="15" color="%23FD3524" moreClasses="w-3 h-3 sm:w-4 sm:h-4" />
        <span class="text-secondary-500 text-xs sm:text-sm">{$t("conversations.copy_text")}</span>
      </Button>
    {/if}

    {#if hasFiles}
      <Button
        onClick={download}
        moreClasses="flex items-center gap-1 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm dark:variant-filled-tertiary bg-tertiary-200"
      >
        <SvgIcon icon="download" size="15" color="%23FD3524" moreClasses="w-3 h-3 sm:w-4 sm:h-4" />
        <span class="text-secondary-500 text-xs sm:text-sm">{$t("conversations.download")}</span>
      </Button>
    {/if}
  </div>
</div>
