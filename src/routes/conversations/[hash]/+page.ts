import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return {
    conversation: {
      id: 1,
      title: `Terran Collective`,
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