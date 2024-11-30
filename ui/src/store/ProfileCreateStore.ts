import type { ProfilesStore } from "@holochain-open-dev/profiles";
import { get, writable } from "svelte/store";

export interface ProfileCreateData {
  firstName: string;
  lastName: string;
  avatar: string;
}

// The profile setup process is a multi-page setup form.
// On the first page, a user enters their first and last name.
// On the second page, a user chooses an avatar picture.
//
// This store holds that state so we can call create_profile with all data,
// from both pages.
export class ProfileCreateStore {
  private data = writable<ProfileCreateData>({
    firstName: "",
    lastName: "",
    avatar: "",
  });

  constructor(private profilesStore: ProfilesStore) {}

  subscribe(run: any) {
    return this.data.subscribe(run);
  }

  update(val: ProfileCreateData) {
    this.data.update((existing) => ({
      ...existing,
      firstName: val.firstName.trim(),
      lastName: val.lastName.trim(),
      avatar: val.avatar,
    }));
  }

  updateAvatar(avatar: string) {
    this.data.update((existing) => ({
      ...existing,
      avatar,
    }));
  }

  create() {
    const { firstName, lastName, avatar } = get(this.data);

    return this.profilesStore.client.createProfile({
      nickname: `${firstName} ${lastName}`,
      fields: {
        avatar,
        firstName,
        lastName,
      },
    });
  }
}
