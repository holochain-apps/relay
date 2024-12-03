import { type DnaHashB64 } from "@holochain/client";
import type { Message } from "../types";
import { ConversationHistoryBucketStore } from "./ConversationHistoryBucketStore";
import { range } from "lodash-es";
import { get } from "@square/svelte-store";

export class ConversationHistoryStore {
  private conversationId: DnaHashB64;
  private buckets: ConversationHistoryBucketStore[];

  /**
   * A List of buckets for a given conversation (i.e. a clone of the relay cell)
   */
  constructor(conversationId: DnaHashB64, currentBucket: number) {
    this.conversationId = conversationId;
    this.buckets = range(0, currentBucket + 1).map(
      (i) => new ConversationHistoryBucketStore(this.conversationId, i),
    );
  }

  /**
   * Returns an array of bucket indices that contain enough messages to meet the targetMessagesCount
   * @param targetMessagesCount - The target number of messages contained within all included buckets.
   *  The total number of messages will be *less* than the targetMessagesCount,
   *  unless a single bucket contains more messages than the targetMessagesCount.
   * @param startingBucket - The bucket index to start searching from
   * @returns Array of selected bucket indices in descending order
   */
  async getBucketsForMessageCount(
    targetMessagesCount: number,
    startingBucket: number,
  ): Promise<number[]> {
    const selectedIndexes: Array<number> = [];

    let i = startingBucket;
    let total = 0;
    for (let i = startingBucket; i >= 0; i--) {
      selectedIndexes.push(i);
      const bucketCount = await this.buckets[i].count.load();
      if (this.buckets[i]) total += bucketCount;
      if (total >= targetMessagesCount) break;
    }

    return selectedIndexes;
  }

  /**
   * Get bucket at index.
   * Creates the bucket if it doesn't exist.
   *
   * @param i index of bucket
   * @returns
   */
  getBucket(i: number): ConversationHistoryBucketStore {
    this.ensure(i);
    return this.buckets[i];
  }

  /**
   * Adds a message hash to its corresponding bucket
   * Creates the bucket if it doesn't exist.
   *
   * @param message - The message to add to the conversation history
   */
  add(message: Message) {
    this.ensure(message.bucket);

    this.buckets[message.bucket].add([message.hash]);
  }

  /**
   * Create bucket at index if it does not exist.
   *
   * @param i index of bucket
   * @returns
   */
  private ensure(i: number) {
    if (this.buckets[i]) return;

    this.buckets[i] = new ConversationHistoryBucketStore(this.conversationId, i);
  }
}
