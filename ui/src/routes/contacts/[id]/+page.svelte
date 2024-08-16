<script lang="ts">
  import { page } from '$app/stores';
  import Header from '$lib/Header.svelte';
  import SvgIcon from "$lib/SvgIcon.svelte";
  import { t } from '$lib/translations';
  import ContactEditor from "../ContactEditor.svelte";

  $: contactId = $page.params.id;
</script>

<Header>
  <button class='text-4xl mr-5 absolute' on:click={() => history.back()}><SvgIcon icon='caretLeft' color='white' size='10' /></button>
  <h1 class="flex-1 text-center">{$t('contacts.edit_contact')}</h1>
</Header>

<ContactEditor editContactId={contactId} />