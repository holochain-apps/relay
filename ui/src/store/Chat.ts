import { writable, get, type Writable } from 'svelte/store';

export class ChatStore {
  private chat: Writable<Chat>;

  constructor(id: string, name: string) {
    this.chat = writable({ id, name, messages: [] });
  }

  get data() {
    return get(this.chat);
  }

  subscribe(run: any) {
    return this.chat.subscribe(run);
  }

  addMessage(author: string, text: string): void {
    this.chat.update(chat => {
      const message = { id: String(chat.messages.length + 1), author, text, timestamp: new Date() };
      return { ...chat, messages: [...chat.messages, message] };
    });
  }
}
