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

/**
 * A TTL cache with an API compatible with an ES6 Map. Requires node 6+.
 * @type {CacheMap<K, V>}
 */
export default class CacheMap<K, V> {
  /**
   * @private
   */
  ttl: number;

  /**
   * @private
   */
  map: Map<K, Entry<V>>;

  /**
   * @param {number} ttl - The TTL for all entries added to this map
   * @param {number} [evictInterval] - How frequently to delete expired entries from the internal
   * map
   * @param {Iterable<[K, V]>} [intialValues] - An iterable such as an array or another map
   * containing the initial values to set in the map
   */
  constructor(ttl: number, evictInterval?: number, intialValues?: Iterable<[K, V]>): void {
    this.ttl = ttl;

    // the internal es6 map where we'll store all our data
    this.map = new Map();

    // a Symbol.iterator method lets us use this class in for-of loops
    // $FlowFixMe - flow doesn't really do custom iterators yet :(
    this[Symbol.iterator] = this.entries;

    if (intialValues) {
      // Fill in the default values
      for (const [key, value] of intialValues) {
        this.set(key, value);
      }
    }

    // We want to periodically clean out the underlying map - otherwise expired entries would stay
    // there forever.
    setInterval(() => this.deleteExpired(), evictInterval || ttl);
  }

  /**
   * Removes all key/value pairs from the Map object.
   */
  clear(): void {
    return this.map.clear();
  }

  /**
   * Removes any value associated with that key
   * @param {K} key - the key to delete
   */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /**
   * @return a new iterator object that contains an array of [key, value] for each element in the
   * map that has not expired
   */
  * entries(): Iterator<[K, V]> {
    for (const [key, entry] of this.map.entries()) {
      // Skip the expired entries, yield the rest
      if (!entry.isExpired()) {
        yield [key, entry.value];
      }
    }
  }

  /**
   * Calls fn once for each non-expired key-value pair in the map object
   * @param fn - the function to call
   * @param [thisArg] - the value of this when fn is called
   */
  forEach(fn: (value: V, index: K, map: this) => mixed, thisArg?: any): void {
    for (const [key, value] of this.entries()) {
      fn.call(thisArg, value, key, this);
    }
  }

  /**
   * @return the value associated with the key, or undefined if there is none or that entry has
   * expired
   */
  get(key: K): ?V {
    const entry = this.map.get(key);

    return entry && !entry.isExpired()
      ? entry.value
      : undefined;
  }

  /**
   * @return indicates if the key has an associated value which hasn't expired
   */
  has(key: K): bool {
    if (!this.map.has(key)) return false;

    const val = this.map.get(key);
    return !!val && !val.isExpired();
  }

  /**
   * @return a new iterator containing the keys of each non-expired entry in the map
   */
  * keys(): Iterator<K> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  /**
   * Sets the value in the map, with a ttl of Date.now() + map.ttl
   * @return the map
   */
  set(key: K, value: V): this {
    this.map.set(key, new Entry(value, this.ttl));
    return this;
  }

  /**
   * The number of non-expired key/value pairs in the map
   */
  get size(): number {
    return Array.from(this.entries()).length;
  }

  /**
   * @return a new iterator containing the values of each non-expired entry in the map
   */
  * values(): Iterator<V> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  /**
   * Removes every entry from the internal map that has already expired
   */
  deleteExpired(): void {
    for (const [key, entry] of this.map) {
      if (entry.isExpired()) this.map.delete(key);
    }
  }

  /**
   * @private
   */
  evictExpired(): void {
    console.warn('CacheMap evictExpired is deprecated. Use deleteExpired instead');
    this.deleteExpired();
  }
}
