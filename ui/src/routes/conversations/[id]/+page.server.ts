import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	return {
    conversation: {
      id: 1,
      name: `Terran Collective`,
      icon: '🚀',
      purpose: `Eact more cheese`,
      messages: [
        {
          id: 1,
          text: 'Hello, world!',
          author: 'Tibet Sprague'
        },
        {
          id: 2,
          text: 'Not this time!',
          author: 'Aaron Brodeur'
        }
      ]
    }
  }
};

// export const actions = {
// 	default: async (event) => {
// 		// Add a message to the conversation
//     const message = {
//       id: 3,
//       author: 'Tibet Sprague',
//       text: 'I am a message'
//     }
//     return message
// 	}
// } satisfies Actions;