<script lang="ts">
  export let moreClasses = '';
  export let onClick = (e: MouseEvent) => {};
</script>

<button class={`bg-primary-50 text-surface-900 rounded-full flex items-center px-5 py-2 mb-4 h-12 disabled:opacity-75 ${moreClasses}`} on:click={onClick} {...$$restProps}>
  <slot></slot>
</button>