import { getContext } from 'svelte';
import type { PageLoad } from './$types';
import { RelayStore } from '$store/RelayStore';

export const load: PageLoad = ({ params }) => {

  // // Assume chatRoomsStore can fetch a room by ID
  // const chat = chatsListStore.getChat(hash);
  // if (chat) {
  //   // You may need to await an async function if fetching from an API
  //   const messages = chat.data.messages;  // This should be a method in your ChatRoom class
  //   return { chat, messages };
  // } else {
  //   return { status: 404, error: new Error('Chat not found') };
  // }

  // let conversationId = params.id;

  // const relayStoreContext: { getStore: () => RelayStore } = getContext('relayStore')
  // let relayStore = relayStoreContext.getStore()

  // let conversation = relayStore.getConversation(conversationId);

  // return { conversation }
}