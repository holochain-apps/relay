<script lang="ts">
  export let moreClasses = '';
  export let onClick = (e: MouseEvent) => {};
</script>

<button class={`variant-filled-primary dark:variant-filled-tertiary rounded-full flex items-center px-5 py-2 mb-4 h-12 disabled:opacity-50 ${moreClasses}`} on:click={onClick} {...$$restProps}>
  <slot></slot>
</button>