<script lang="ts">
  export let moreClasses = "";
  export let onClick = (e: MouseEvent) => {};
</script>

<button
  class={`variant-filled-primary mb-4 flex h-12 items-center rounded-full px-5 py-2 dark:variant-filled-tertiary disabled:opacity-50 ${moreClasses}`}
  on:click={onClick}
  {...$$restProps}
>
  <slot></slot>
</button>
