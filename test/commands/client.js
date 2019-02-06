import expect from 'expect';

import MockRedis from '../../src';

describe('client', () => {
  describe('setname', () => {
    it('should return OK and set a the name clientProps accordingly', () => {
      const redis = new MockRedis();
      return redis
        .client('setname', 'Johnson')
        .then(() => expect(redis.clientProps.name).toBe('Johnson'));
    });
  });

  describe('getname', () => {
    it('should return undefined if there was no name setted', () => {
      const redis = new MockRedis();
      return redis.client('getname').then(result => expect(result).toBeFalsy());
    });

    it('should return the name when a value exists', () => {
      const redis = new MockRedis();
      redis.clientProps = { name: 'Magic Johnson' };
      return redis
        .client('getname')
        .then(result => expect(result).toBe('Magic Johnson'));
    });
  });
});
