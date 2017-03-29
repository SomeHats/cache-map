import { expect } from 'chai';
import sinon from 'sinon';
import CacheMap from '../src/CacheMap';

describe('CacheMap', () => {
  const entries = [[1, 'a'], [2, 'b'], [3, 'c']];
  const keys = [1, 2, 3];
  const values = ['a', 'b', 'c'];

  const checkExpiredEntries = (check) => {
    const map = new CacheMap(1000, Infinity);

    map.set(1, 'a');
    clock.tick(200);
    map.set(2, 'b');
    clock.tick(200);
    map.set(3, 'c');

    check(map, new Map([[1, 'a'], [2, 'b'], [3, 'c']]));
    clock.tick(700);
    check(map, new Map([[2, 'b'], [3, 'c']]));
    clock.tick(200);
    check(map, new Map([[3, 'c']]));
    clock.tick(200);
    check(map, new Map([]));
  };

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  describe('constructor', () => {
    it('sets ttl', () => {
      const map = new CacheMap(1000);
      expect(map).to.have.property('ttl', 1000);
    });

    it('creates a backing map', () => {
      const map = new CacheMap(1000);
      expect(map).to.have.property('map').to.be.instanceof(Map);
    });

    it('populates the map with existing entries', () => {
      const map = new CacheMap(1000, null, entries);
      expect(Array.from(map)).to.eql(entries);
    });
  });

  describe('clear()', () => {
    it('empties the map', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map).to.have.property('size', 3);
      map.clear();
      expect(map).to.have.property('size', 0);
    });
  });

  describe('delete(key)', () => {
    it('deletes a key from the map', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.has(1)).to.eql(true);
      map.delete(1);
      expect(map.has(1)).to.eql(false);
      expect(map.size).to.eql(2);
      map.delete(2);
      map.delete(3);
      expect(map.size).to.eql(0);
    });
  });

  [
    ['entries()', map => map.entries()],
    ['@@iterator', map => map],
  ].forEach(([desc, getIterator]) => describe(desc, () => {
    it('returns an iterator', () => {
      const map = new CacheMap(1000, null, entries);
      expect(getIterator(map)).to.have.property(Symbol.iterator);
    });

    it('yields [key, value] entries', () => {
      const map = new CacheMap(1000, null, entries);
      expect(Array.from(getIterator(map))).to.eql(entries);
    });

    it('will not yield expired entries', () => {
      checkExpiredEntries((actual, expected) => {
        expect(Array.from(getIterator(actual))).to.eql(Array.from(getIterator(expected)));
      });
    });
  }));

  describe('forEach(fn, thisArg)', () => {
    it('calls fn with the correct args', () => {
      const map = new CacheMap(1000, null, entries);
      const fn = sinon.stub();
      map.forEach(fn);
      expect(fn.args).to.eql(entries.map(([k, v]) => [v, k, map]));
    });

    it('uses undefined if no this arg passed', () => {
      const map = new CacheMap(1000, null, entries);
      const fn = sinon.stub();
      map.forEach(fn);
      expect(fn.alwaysCalledOn(undefined)).to.eql(true);
    });

    it('uses a this arg when on is passed', () => {
      const map = new CacheMap(1000, null, entries);
      const fn = sinon.stub();
      const thisArg = {};
      map.forEach(fn, thisArg);
      expect(fn.alwaysCalledOn(thisArg)).to.eql(true);
    });

    it('wont call fn with exired entries', () => {
      checkExpiredEntries((actual, expected) => {
        const fn = sinon.stub();
        actual.forEach(fn);
        expect(fn.args).to.eql(Array.from(expected).map(([k, v]) => [v, k, actual]));
      });
    });
  });

  describe('get(key)', () => {
    it('returns the value for that key', () => {
      const map = new CacheMap(1000, null, entries);
      entries.forEach(([k, v]) => expect(map.get(k)).to.eql(v));
    });

    it('returns undefined for unknown keys', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.get('whatever')).to.eql(undefined);
    });

    it('returns undefined for expired keys', () => {
      checkExpiredEntries((actual, expected) => {
        keys.forEach(key =>
          expect(actual.get(key)).to.eql(expected.get(key)));
      });
    });
  });

  describe('has(key)', () => {
    it('returns true for keys in the map', () => {
      const map = new CacheMap(1000, null, entries);
      keys.forEach(key => expect(map.has(key)).to.eql(true));
    });

    it('returns false for unknown keys', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.has('whatever')).to.eql(false);
    });

    it('returns false for expired keys', () => {
      checkExpiredEntries((actual, expected) => {
        keys.forEach(key => expect(actual.has(key)).to.eql(expected.has(key)));
      });
    });
  });

  describe('keys()', () => {
    it('returns an iterator', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.keys()).to.have.property(Symbol.iterator);
    });

    it('yields the keys in the map', () => {
      const map = new CacheMap(1000, null, entries);
      expect(Array.from(map.keys())).to.eql(keys);
    });

    it('does not yield expired keys', () => {
      checkExpiredEntries((actual, expected) => {
        expect(Array.from(expected.keys())).to.eql(Array.from(actual.keys()));
      });
    });
  });

  describe('set(key, value)', () => {
    let entry;

    beforeEach(() => {
      const map = new CacheMap(1000);
      map.set(1, 'a');
      entry = map.map.get(1);
    });

    it('creates a new entry in the map', () => {
      expect(entry).to.be.defined;
    });

    it('sets the value on the entry', () => {
      expect(entry).to.have.property('value', 'a');
    });

    it('sets expiresAt on the entry', () => {
      expect(entry).to.have.property('expiresAt', Date.now() + 1000);
    });
  });

  describe('size', () => {
    it('returns the number of entries in the map', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.size).to.eql(entries.length);
    });

    it('doesnt count expired entries', () => {
      checkExpiredEntries((actual, expected) => {
        expect(actual.size).to.eql(expected.size);
      });
    });
  });

  describe('values()', () => {
    it('returns an iterator', () => {
      const map = new CacheMap(1000, null, entries);
      expect(map.values()).to.have.property(Symbol.iterator);
    });

    it('yields the values in the map', () => {
      const map = new CacheMap(1000, null, entries);
      expect(Array.from(map.values())).to.eql(values);
    });

    it('does not yield expired values', () => {
      checkExpiredEntries((actual, expected) => {
        expect(Array.from(expected.values())).to.eql(Array.from(actual.values()));
      });
    });
  });

  describe('deleteExpired()', () => {
    it('removes expired elements from the internal map', () => {
      checkExpiredEntries((actual, expected) => {
        expect(actual.map.size).to.be.at.least(expected.size);
        actual.deleteExpired();
        expect(actual.map.size).to.eql(expected.size);
      });
    });
  });

  describe('active eviction', () => {
    it('removes expired entries automatically', () => {
      const map = new CacheMap(1000, 1000, entries);
      expect(map.map.size).to.eql(entries.length);
      clock.tick(2000);
      expect(map.map.size).to.eql(0);
    });
  });
});
