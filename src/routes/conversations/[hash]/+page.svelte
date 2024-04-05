<script lang="ts">
	import Header from '$lib/Header.svelte';
  import type { PageData } from './$types';

	export let data: PageData;
</script>

<Header>
  <a class='text-4xl' href="/conversations">&lt;</a>
  <h1 class="flex-1">{data.conversation.icon}{data.conversation.title}</h1>
</Header>

<div class="container h-full mx-auto flex justify-center items-center flex-col">
  <h1 class='text-4xl'>{@html data.conversation.icon} {@html data.conversation.title}</h1>
  <ul>
    {#each data.conversation.messages as message (message.id)}
      <li>
        <span>{@html message.author}: </span>
        <span>{@html message.text}</span>
      </li>
    {/each}
  </ul>
</div>
