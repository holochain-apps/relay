import { writable } from "svelte/store";

// The profile setup process is a multi-page setup form.
// On the first page, a user enters their first and last name.
// On the second page, a user chooses an avatar picture.
//
// This store holds that state so we can call create_profile with all necessary data.
export const ProfileCreateStore = writable({
  firstName: "",
  lastName: "",
  avatar: "",
});
