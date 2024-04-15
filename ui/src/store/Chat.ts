import { writable } from 'svelte/store'

export const chat = writable<Chat>({ id: "0", name: "", messages: []})

let isAdded = false
let initChatCount = 25
//let tableName = 'global_chat'

export const loadChat = async () => {
  // const { data, error } = await supabase.from(tableName).select().order('id', { ascending: false }).limit(initChatCount)
  //chat.set(data.reverse())

  chat.update(c => {
    c.id = '1'
    c.name = 'Terran Collective'
    c.messages = [
      { id: '1', text: 'General Chat', author: 'Tibet Sprague', timestamp: new Date()},
      { id: '2', text: 'Tech Talk', author: 'T Sprague', timestamp: new Date()},
      { id: '3', text: 'Svelte Fans', author: 'Aaron', timestamp: new Date()}
    ]
    return c
  })
}

// export const loadMore = async () => {
//   const { data, error } = await supabase
//     .from(tableName)
//     .select()
//     .order('id', { ascending: false })
//     .limit((initChatCount += 5))
//   chat.set(data.reverse())
// }

export const sendMessage = async (author: string, text: string) => {
  // const { data, error } = await supabase
  //   .from(tableName)
  //   .insert([{ username, message, replied_to_id, replied_to_message, replied_to_username }])
  // loadChat()
  chat.update(c => {
    c.messages.push({ id: String(c.messages.length + 1), text, author, timestamp: new Date() })
    return c
  })

  //update(chat => {
    //         store.messages.push(message);
    //         return store;
    //       });
}

// export const replyData = async (id) => {
//   const { data, error } = await supabase.from(tableName).select().eq('id', id)
//   if (error) {
//     return console.error(error)
//   }
//   console.log('chatstore (replydata):', data)
//   return data
// }

// // Add username and timestamp when it was created.
// export const addUserdata = (username, timestamp) => {
//   let isOver24hrs = computeDate(loadUserdata().tempDate)

//   if (loadUserdata().tempUser == null || (loadUserdata().tempUser === username && isOver24hrs)) {
//     setUserdata(username, timestamp)
//   }
// }

// // Adds user data into localstorage
// export const setUserdata = async (username, timestamp) => {
//   localStorage.setItem('supachatUsername', username)
//   localStorage.setItem('supachatTimestamp', timestamp)
// }

// // Retrieve user data from localstorage
// export const loadUserdata = async () => {
//   if (typeof localStorage != undefined) {
//     let tempUser = localStorage.getItem('supachatUsername')
//     let tempDate = localStorage.getItem('supachatTimestamp')

//     computeDate(tempDate)
//     return { tempUser, tempDate }
//   } else {
//     localStorage.clear()
//   }
// }

// //Check time interval (24 Hrs)
// export const computeDate = (tempDate) => {
//   let prevTime = new Date(tempDate)
//   let thisTime = new Date()
//   let diff = thisTime.getTime() - prevTime.getTime()
//   let lapsedTime = diff / 3600000

//   if (lapsedTime > 24) {
//     localStorage.clear()
//     return true
//   } else {
//     return false
//   }
// }

// function createChatStore() {
//   const { subscribe, update } = writable<ChatStore>({
//     messages: [],
//     addMessage: (message: Message) => {}
//   });

//   return {
//     subscribe,
//     addMessage: (message: Message) => {
//       update(store => {
//         store.messages.push(message);
//         return store;
//       });
//     },
//     setMessages: (messages: Message[]) => {
//       update(store => { store.messages = messages; return store; });
//     }
//   };
// }

// export { createChatStore };
