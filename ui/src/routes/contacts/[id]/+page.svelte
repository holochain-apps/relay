<script lang="ts">
  import { modeCurrent } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Header from "$lib/Header.svelte";
  import SvgIcon from "$lib/SvgIcon.svelte";
  import ContactEditor from "../ContactEditor.svelte";

  $: contactId = $page.params.id;
</script>

<Header backUrl="/create" />

<ContactEditor editContactId={contactId} />
