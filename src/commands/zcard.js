import Map from 'es6-map';

export function zcard(zkey) {
  const zset = this.data.get(zkey);
  if (!zset) {
    return 0;
  }
  if (!(zset instanceof Map)) {
    throw new Error(`Key ${zkey} does not contain a zset`);
  }
  return this.data.get(zkey).size;
}
