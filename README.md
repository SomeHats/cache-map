# cache-map
A TTL cache with an API compatible with an ES6 Map. Requires node 6+.

### Usage:
```js
// @flow
import CacheMap from 'cache-map';

const ttl = 1000;

const myCache = new CacheMap<number, string>(ttl);

myCache.set(1, 'hello');
myCache.set(2, 'world');
myCache.size;
// > 2

myCache.get(1);
// > 'hello'

/* 🕰  time passes 🕰 */
myCache.size;
// > 0

myCache.get(1);
// > undefined
```
