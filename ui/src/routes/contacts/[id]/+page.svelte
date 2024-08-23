<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import ContactEditor from "../ContactEditor.svelte";

  $: contactId = $page.params.id;
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => goto('/create')}>
    <SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' />
  </button>
</Header>

<ContactEditor editContactId={contactId} />