import { writable } from 'svelte/store';

const chatsList = writable<Chat[]>([]);

export default chatsList;