<script lang="ts">
	import Header from '$lib/Header.svelte';
  import type { PageData } from './$types';

	export let data: PageData;
</script>

<Header>
	<h1>Inbox</h1>
</Header>

<div class="container h-full mx-auto flex justify-center items-center flex-col">
  <ul>
    {#each data.conversations as conversation (conversation.id)}
      <li>
        <a href="/conversations/{conversation.id}">
          <span>{@html conversation.icon}</span>
          <span>{@html conversation.title}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>
