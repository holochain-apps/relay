// src/stores/ChatRoomsStore.ts
import { writable, get, type Subscriber, type Invalidator, type Unsubscriber, type Writable } from 'svelte/store';
import { ChatStore } from './Chat';

export class ChatsListStore {
  private chats: Writable<ChatStore[]>;
  public subscribe: (this: void, run: Subscriber<ChatStore[]>, invalidate?: Invalidator<ChatStore[]>) => Unsubscriber;

  constructor() {
    this.chats = writable([]);
    this.subscribe = this.chats.subscribe;
  }

  addChat(name: string): void {
    const newChat = new ChatStore(String(get(this.chats).length + 1), name);
    this.chats.update(chats => [...chats, newChat]);
  }

  removeChat(id: string): void {
    this.chats.update(chats =>
      chats.filter(chat => chat.data.id !== id)
    );
  }

  getChat(id: string): ChatStore | undefined {
    let foundChat
    this.chats.subscribe(chats => {
      foundChat = chats.find(chat => chat.data.id === id);
    })();

    //return get(this.chats).find(chat => chat.data.id === id);
    return foundChat;
  }
}

export const chatsListStore = new ChatsListStore();