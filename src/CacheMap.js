// @flow

class Entry<T> {
  value: T;
  expiresAt: number;

  constructor(value: T, ttl: number) {
    this.value = value;
    this.expiresAt = Date.now() + ttl;
  }

  isExpired(): bool {
    return Date.now() > this.expiresAt;
  }
}

export default class CacheMap<K, V> {
  ttl: number;
  map: Map<K, Entry<V>>;

  constructor(ttl: number, evictInterval?: number, iterable?: Iterable<[K, V]>): void {
    this.ttl = ttl;

    // the internal es6 map where we'll store all our data
    this.map = new Map();

    // a Symbol.iterator method lets us use this class in for-of loops
    // $FlowFixMe - flow doesn't really do custom iterators yet :(
    this[Symbol.iterator] = this.entries;

    if (iterable) {
      // Fill in the default values
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }

    // We want to periodically clean out the underlying map - otherwise expired entries would stay
    // there forever.
    setInterval(() => this.deleteExpired(), evictInterval || ttl);
  }

  clear(): void {
    return this.map.clear();
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  * entries(): Iterator<[K, V]> {
    for (const [key, entry] of this.map.entries()) {
      // Skip the expired entries, yield the rest
      if (!entry.isExpired()) {
        yield [key, entry.value];
      }
    }
  }

  forEach(fn: (value: V, index: K, map: this) => mixed, thisArg?: any): void {
    for (const [key, value] of this.entries()) {
      fn.call(thisArg, value, key, this);
    }
  }

  get(key: K): ?V {
    const entry = this.map.get(key);

    return entry && !entry.isExpired()
      ? entry.value
      : undefined;
  }

  has(key: K): boolean {
    if (!this.map.has(key)) return false;

    const val = this.map.get(key);
    return !!val && !val.isExpired();
  }

  * keys(): Iterator<K> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  set(key: K, value: V): this {
    this.map.set(key, new Entry(value, this.ttl));
    return this;
  }

  get size(): number {
    return Array.from(this.entries()).length;
  }

  * values(): Iterator<V> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  // remove any expired entries from the internal map
  deleteExpired(): void {
    for (const [key, entry] of this.map) {
      if (entry.isExpired()) this.map.delete(key);
    }
  }

  evictExpired(): void {
    console.warn('CacheMap evictExpired is deprecated. Use deleteExpired instead');
    this.deleteExpired();
  }
}
