<script lang="ts">
  export let moreClasses = "";
  export let onClick = (e: MouseEvent) => {};
</script>

<button
  class={`variant-filled-primary dark:variant-filled-tertiary mb-4 flex h-12 items-center rounded-full px-5 py-2 disabled:opacity-50 ${moreClasses}`}
  on:click={onClick}
  {...$$restProps}
>
  <slot></slot>
</button>
