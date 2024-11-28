import type { ActionHashB64, DnaHashB64 } from "@holochain/client";
import { persisted, type Persisted, get } from "@square/svelte-store";

export class ConversationHistoryBucketStore {
  /// Hashes of messages in the bucket
  public hashes: Persisted<Set<ActionHashB64>>;

  constructor(
    conversationId: DnaHashB64,
    bucketIndex: number,
    hashes: Array<ActionHashB64> = []
  ) {
    this.hashes = persisted(
      new Set(hashes),
      `CONVERSATIONS.${conversationId}.BUCKETS.${bucketIndex}.HASHES`
    );
  }

  get count(): number {
    return get(this.hashes).size;
  }

  add(hashes: Array<ActionHashB64>): boolean {
    const countBefore = this.count;
    this.hashes.update((existing) => new Set([...existing, ...hashes]));
    const sizeChanged = countBefore != this.count;

    return sizeChanged;
  }

  missingHashes(hashes: Array<ActionHashB64>): Array<ActionHashB64> {
    const s = new Set(hashes);
    const missing = Array.from(s.difference(get(this.hashes)));

    return missing;
  }
}
