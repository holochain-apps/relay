export const prerender = true;
export const ssr = false;

// import * as db from '$lib/server/database';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  return {}
};