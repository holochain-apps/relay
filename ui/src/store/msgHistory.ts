import { encodeHashToBase64, type Dna, type DnaHash, type DnaHashB64 } from "@holochain/client";
import type { Message } from "../types";
import { Bucket } from "./bucket";
import { derived, get, type Readable, writable, type Writable } from "svelte/store";

export class MsgHistory {
  private buckets: Writable<Bucket[]>;
  private dnaB64: DnaHashB64;
  public messageCount: Readable<number>;

  constructor(currentBucket: number, dnaHash: DnaHash) {
    this.dnaB64 = encodeHashToBase64(dnaHash);
    const buckets: Bucket[] = [];
    for (let b = 0; b <= currentBucket; b += 1) {
      const bucketJSON = localStorage.getItem(`c.${this.dnaB64}.${b}`);
      buckets[b] = bucketJSON ? new Bucket(bucketJSON) : new Bucket(undefined);
    }
    this.buckets = writable(buckets);
    this.messageCount = derived(this.buckets, ($b) => {
      let count = 0;
      $b.forEach((b) => (count += b.count));
      return count;
    });
  }

  bucketsForSet(setSize: number, startingBucket: number): number[] {
    let bucket = startingBucket;
    const bucketsInSet: Array<number> = [];
    let count = 0;
    // add buckets until we get to threshold of what to load
    let buckets = get(this.buckets);
    do {
      bucketsInSet.push(bucket);
      const h = buckets[bucket];
      if (h) {
        const size = h.count;
        count += size;
      }
      bucket -= 1;
    } while (bucket >= 0 && count < setSize);
    return bucketsInSet;
  }

  ensure(b: number) {
    if (get(this.buckets)[b] == undefined) {
      this.buckets.update((buckets) => {
        buckets[b] = new Bucket([]);
        return buckets;
      });
    }
  }
  getBucket(b: number): Bucket {
    this.ensure(b);
    let buckets = get(this.buckets);
    return buckets[b];
  }

  add(message: Message) {
    this.buckets.update((buckets) => {
      const bucket = buckets[message.bucket];
      if (bucket === undefined) {
        buckets[message.bucket] = new Bucket([message.hash]);
      } else {
        bucket.add([message.hash]);
      }
      return buckets;
    });
    this.saveBucket(message.bucket);
  }

  saveBucket(b: number) {
    const bucket = this.getBucket(b);
    localStorage.setItem(`c.${this.dnaB64}.${b}`, bucket.toJSON());
  }
}
