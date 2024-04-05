import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return {
    conversations: [
      {
        id: 1,
        title: `Terran Collective`,
        icon: '🚀',
        purpose: `Eact more cheese`
      },
      {
        id: 2,
        title: `Hylo`,
        icon: '🕸️',
        purpose: `Prosocial coordination`
      }
    ]
  }
};