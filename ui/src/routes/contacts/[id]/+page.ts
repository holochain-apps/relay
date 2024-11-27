import type { PageLoad } from "./$types";

import type { EntryGenerator } from "./$types";

export const entries: EntryGenerator = () => {
  return [{ id: "relay.0" }];
};

export const load: PageLoad = ({ params }) => {};
