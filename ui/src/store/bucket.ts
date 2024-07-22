import type { ActionHashB64 } from "@holochain/client"

export class Bucket {
    public type: BucketType = BucketType.Hashes
    public hashes: Set<ActionHashB64> = new Set()
    private _count: number = 0
    constructor(input:Array<ActionHashB64> | number | string | undefined) {
        switch (typeof(input)) {
        case "number": 
            this.initAsCount(input)
            break;
        case "string":
            try {
                const sb = JSON.parse(input)
                if (typeof(sb) == "number")
                    this.initAsCount(sb)
                else {
                    this.initAsHashes(sb)
                }
            } catch(e) {
                console.log("badly formed bucket ", input, e)
            }
            break;
        case "object":
            this.initAsHashes(input)
        }
    }

    private initAsHashes(hashes:Array<ActionHashB64>) {
        this.type = BucketType.Hashes
        this.hashes = new Set(hashes)
    }

    private initAsCount(count: number) {
        this.type = BucketType.Hashes
        this._count = count
    }

    get count(): number {
        if (this.type === BucketType.Count) return this._count
        return this.hashes!.size
    }

    toJSON() : string {
        const sb = this.type === BucketType.Hashes ? 
          Array.from(this.hashes!.keys()) : this._count
        return JSON.stringify(sb)
    }

    add(hashes: Array<ActionHashB64>) : boolean {
        const countBefore = this.count
        if (this.type == BucketType.Count) {
            if (this._count == 0) {
                this.type = BucketType.Hashes
                this.hashes = new Set(hashes)
            } else {
                this._count += hashes.length
            }
        } else {    
            hashes.forEach(item => this.hashes!.add(item))
        }
        return countBefore != this.count
    }

    missingHashes(hashes: Array<ActionHashB64>) : Array<ActionHashB64> {
        if (this.type === BucketType.Count) {
            return hashes
        } else {
            const s: Set<ActionHashB64> = new Set(hashes)
            // @ts-ignore  Why isn't "difference" not being understood by my IDE?
            return Array.from(s.difference(this.hashes!))
        }
    }

    ensureIsHashType() {
        if (this.type === BucketType.Count) {
            this.initAsHashes([])
        }
    }
}

export enum BucketType {
    Hashes,
    Count
}