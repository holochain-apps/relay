import { writable } from "svelte/store";

export const UserStore = writable({
  firstName: "",
  lastName: "",
  avatar: "",
});
