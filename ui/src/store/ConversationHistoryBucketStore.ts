import type { ActionHashB64, DnaHashB64 } from "@holochain/client";
import { persisted, type Persisted, derived, type Loadable, get } from "@square/svelte-store";

export class ConversationHistoryBucketStore {
  /// Hashes of messages in the bucket
  public hashes: Persisted<Set<ActionHashB64>>;

  /// Size of bucket
  public count: Loadable<number>;

  constructor(conversationId: DnaHashB64, bucket: number, hashes: Array<ActionHashB64> = []) {
    this.hashes = persisted(
      new Set(hashes),
      `CONVERSATIONS.${conversationId}.BUCKETS.${bucket}.HASHES`,
    );
    this.count = derived(this.hashes, ($hashes) => ($hashes ? $hashes.size : 0));
  }

  add(hashes: Array<ActionHashB64>): boolean {
    const countBefore = this.count;
    this.hashes.update((existing) => new Set([...existing, ...hashes]));
    const sizeChanged = countBefore != this.count;

    return sizeChanged;
  }

  async missingHashes(hashes: Array<ActionHashB64>): Promise<Array<ActionHashB64>> {
    await this.hashes.load();
    const s = new Set(hashes);
    const missing = Array.from(s.difference(get(this.hashes)));

    return missing;
  }
}
