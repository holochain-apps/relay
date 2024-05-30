import { get, writable, type Unsubscriber, type Writable } from "svelte/store";

// export class UserStore {
//   name: Writable<string | null>;

//   constructor() {
//     const storedUserName = localStorage.getItem("user");
//     this.name = writable(storedUserName);
//   }

//   // Check if user is logged in (todo how to make this a reactive function?)
//   isLoggedIn(): boolean {
//     return get(this.name) !== null;
//   }

//   // Login user
//   login(username: string): void {
//     localStorage.setItem("user", username);
//     this.name.set(username);
//   }
// }

export const UserStore = writable({
  nickname: '',
  avatar: ''
});