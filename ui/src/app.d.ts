// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

interface Chat {
  id: string;
  name: string;
  description?: string;
  messages: Message[];
}

interface Message {
  id: string;
  author: string;
  timestamp: Date;
  text: string;
}

interface ChatStore {
  messages: Message[];
  addMessage: (message: Message) => void;
}