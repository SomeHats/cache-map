"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// @flow

class Entry /*:: <T>*/ {
  /*:: value: T;*/
  /*:: setAt: number;*/


  constructor(value /*: T*/) {
    this.value = value;
    this.setAt = Date.now();
  }
}

class TTLMap /*:: <K, V>*/ {
  /*:: ttl: number;*/
  /*:: length: number;*/
  /*:: _map: Map<K, Entry<V>>;*/


  constructor(ttl /*: number*/, evictInterval /*:: ?: number*/, iterable /*:: ?: Iterable<[K, V]>*/) /*: void*/ {
    const initialValues = iterable ? Array.from(iterable).map(([key, value] /*: [K, V]*/) /*: [K, Entry<V>]*/ => [key, new Entry(value)]) : undefined;

    this._map = new Map(initialValues);
    this.ttl = ttl;
    this.length = 0;
    setInterval(() => this.evictExpired(), evictInterval || ttl / 5);
  }

  clear() /*: void*/ {
    return this._map.clear();
  }

  delete(key /*: K*/) /*: boolean*/ {
    return this._map.delete(key);
  }

  *entries() /*: Iterator<[K, V]>*/ {
    for (let [key, { value }] of this._map.entries()) {
      yield [key, value];
    }
  }

  forEach(fn /*: (value: V, index: K, map: TTLMap<K, V>) => mixed*/, thisArg /*:: ?: any*/) /*: void*/ {
    this._map.forEach(({ value }, key) => fn.call(thisArg, value, key, this));
  }

  get(key /*: K*/) /*: ?V*/ {
    const entry = this._map.get(key);
    return entry ? entry.value : undefined;
  }

  has(key /*: K*/) /*: boolean*/ {
    return this._map.has(key);
  }

  keys() /*: Iterator<K>*/ {
    return this._map.keys();
  }

  set(key /*: K*/, value /*: V*/) /*: this*/ {
    this._map.set(key, new Entry(value));
    return this;
  }

  get size() /*: number*/ {
    return this._map.size;
  }

  *values() /*: Iterator<V>*/ {
    for (let { value } of this._map.values()) {
      yield value;
    }
  }

  evictExpired() /*: void*/ {
    const evictBefore = Date.now() - this.ttl;
    for (const [key, { setAt }] of this._map.entries()) {
      if (setAt < evictBefore) {
        this._map.delete(key);
      } else {
        // Map.entries iterates in insertion order, so as soon as we encounter something inserted
        // later than we care about, we can stop iterating
        break;
      }
    }
  }
}
exports.default = TTLMap;