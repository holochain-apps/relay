<script lang="ts">
  import { onMount } from "svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { modeCurrent } from "@skeletonlabs/skeleton";
  export let pdfDataUrl: string;
  export let width: number;
  export let height: number;
  export let fallbackIcon: string = "file";

  let thumbnailUrl: string | null = null;

  onMount(async () => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;
      const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not get 2D rendering context");
      }
      const viewport = page.getViewport({ scale: 1 });
      canvas.height = height;
      canvas.width = width;
      const renderContext = {
        canvasContext: context,
        viewport: page.getViewport({
          scale: Math.min(width / viewport.width, height / viewport.height),
        }),
      };
      await page.render(renderContext).promise;
      thumbnailUrl = canvas.toDataURL();
    } catch (error) {
      console.error("Error generating PDF thumbnail:", error);
      thumbnailUrl = null;
    }
  });
</script>

{#if thumbnailUrl}
  <img
    src={thumbnailUrl}
    alt="PDF Thumbnail"
    class="rounded object-cover"
    style="width: {width}px; height: {height}px;"
  />
{:else}
  <SvgIcon icon={fallbackIcon} color={$modeCurrent ? "black" : "white"} size={width.toString()} />
{/if}
