<script lang="ts">
  import { modeCurrent } from '@skeletonlabs/skeleton';
  import { goto } from '$app/navigation';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import ContactEditor from "../ContactEditor.svelte";
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => goto('/create')}>
    <SvgIcon icon='caretLeft' color={$modeCurrent ? '%232e2e2e' : 'white'} size='10' />
  </button>
  <h1 class="flex-1 text-center">{$t('contacts.create_new_contact')}</h1>
</Header>

<ContactEditor />