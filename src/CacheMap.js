// @flow

class Entry<T> {
  value: T;
  setAt: number;

  constructor(value: T) {
    this.value = value;
    this.setAt = Date.now();
  }
}

export default class CacheMap<K, V> {
  ttl: number;
  length: number;
  map: Map<K, Entry<V>>;

  constructor(ttl: number, evictInterval?: number, iterable?: Iterable<[K, V]>): void {
    const initialValues = iterable
      ? Array.from(iterable).map(([key, value]: [K, V]): [K, Entry<V>] => [key, new Entry(value)])
      : undefined;

    this.map = new Map(initialValues);
    this.ttl = ttl;
    this.length = 0;
    setInterval(() => this.evictExpired(), evictInterval || ttl / 5);
  }

  clear(): void {
    return this.map.clear();
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  * entries(): Iterator<[K, V]> {
    for (const [key, { value }] of this.map.entries()) {
      yield [key, value];
    }
  }

  forEach(fn: (value: V, index: K, map: this) => mixed, thisArg?: any): void {
    this.map.forEach(({ value }, key) => fn.call(thisArg, value, key, this));
  }

  get(key: K): ?V {
    const entry = this.map.get(key);
    return entry ? entry.value : undefined;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  keys(): Iterator<K> {
    return this.map.keys();
  }

  set(key: K, value: V): this {
    this.map.set(key, new Entry(value));
    return this;
  }

  get size(): number {
    return this.map.size;
  }

  * values(): Iterator<V> {
    for (const { value } of this.map.values()) {
      yield value;
    }
  }

  evictExpired(): void {
    const evictBefore = Date.now() - this.ttl;
    for (const [key, { setAt }] of this.map.entries()) {
      if (setAt < evictBefore) {
        this.map.delete(key);
      } else {
        // Map.entries iterates in insertion order, so as soon as we encounter something inserted
        // later than we care about, we can stop iterating
        break;
      }
    }
  }
}
