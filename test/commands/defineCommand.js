import expect from 'expect';
import fengari from 'fengari';
import interop from 'fengari-interop';

import MockRedis from '../../src';
import { init, dispose } from '../../src/lua';
import {
  defineRedisObject,
  defineKeys,
  defineArgv,
} from '../../src/commands/defineCommand';

const { lua } = fengari;

describe('defineCommand', () => {
  let vm;

  beforeEach(() => {
    vm = init();
  });

  afterEach(() => {
    dispose(vm);
  });

  describe('setting up the LUA server context', () => {
    describe('isTopArray', () => {
      it('should be an array', () => {
        vm.luaExecString('return {1, 2}');
        expect(vm.utils.isTopArray(vm.L)).toEqual(true);
      });
      it('should NOT be an array when it is a string', () => {
        interop.push(vm.L, 'hi');
        expect(vm.utils.isTopArray(vm.L)).toEqual(false);
      });
      it('should NOT be an array when it is a number', () => {
        interop.push(vm.L, 1000);
        expect(vm.utils.isTopArray(vm.L)).toEqual(false);
      });
      it('should NOT be an array when it is a userdata', () => {
        interop.push(vm.L, { hi: 'hello', bye: 'goodbye' });
        expect(vm.utils.isTopArray(vm.L)).toEqual(false);
      });
      it('should NOT be an array when it is a table', () => {
        vm.utils.push({ hi: 'hello', bye: 'goodbye' });
        expect(vm.utils.isTopArray(vm.L)).toEqual(false);
      });
    });
    describe('the redis global object', () => {
      it('should execute a lua script that calls the call fn of the global redis object', () => {
        // a flag to expect on
        let wasCalledWith = false;

        // the call function
        const call = () => {
          const top = lua.lua_gettop(vm.L);
          const args = [];
          let a = -top;
          while (a < 0) {
            args.push(a);
            a += 1;
          }
          const argu = args.map(i => interop.tojs(vm.L, i));

          wasCalledWith = argu;

          interop.push(vm.L, 15);

          return 1;
        };

        defineRedisObject(vm)(call);

        // execute fn
        vm.luaExecString(`
          local rcall = redis.call
          local exists = rcall("EXISTS", "PEPE", "THIRD")
          print("exists es de", type(exists))
          if (exists == nil) then
            error("todo mal")
          end

          local testingReturningAnyNumber = 15200
          return testingReturningAnyNumber
        `);

        // expect it was called and we can get the right arguments
        expect(wasCalledWith).toEqual([3, 'EXISTS', 'PEPE', 'THIRD']);
      });
    });

    describe('the KEYS and ARGV global tables', () => {
      it('should be able to get key and arguments', () => {
        const args = [
          'key1',
          'key2',
          'keyTul',
          'arg1',
          'arg2',
          'argof***yourself',
        ];

        defineKeys(vm, 3, args);
        defineArgv(vm, 3, args);

        vm.luaExecString(`
          local check = function(tname, t, i, v)
              if (v == nil) then
                error("while comparing " .. tname .. " at " .. i .. " the value provided to compare was nil")
              end
              if (t[i] == nil) then
                error(tname .. " at " .. i .. " was nil")
              end
              if (t[i] ~= v) then
                  local msg = "Error at " .. tname .. " index " .. i .. " was not equal to " .. v .. " but was " .. t[i]
                  error(msg)
              end
          end
          local keyCheck = function(i, v)
            return check("KEYS", KEYS, i, v)
          end
          local argCheck = function(i, v)
            return check("ARGV", ARGV, i, v)
          end

          keyCheck(1, "${args[0]}")
          keyCheck(2, "${args[1]}")
          keyCheck(3, "${args[2]}")

          argCheck(1, "${args[3]}")
          argCheck(2, "${args[4]}")
          argCheck(3, "${args[5]}")
        `);
      });
    });
  });

  describe('setting up a custom command', () => {
    it('should call a custom commmand', () => {
      const luaCode = `
        local rcall = redis.call
        local value1 = rcall("GET", KEYS[1])
        local value2 = value1 + ARGV[1]
        rcall("SET", KEYS[1], value2)
        return value2
      `;
      const redis = new MockRedis();
      const someKey = 'k';
      const initialValue = 1;
      const definition = { numberOfKeys: 1, lua: luaCode };
      return redis
        .set(someKey, initialValue)
        .then(status => expect(status).toBe('OK'))
        .then(() => {
          redis.defineCommand('inc2', definition);
        })
        .then(() => redis.inc2(someKey, 5))
        .then(val => expect(val).toBe(6));
    });
  });

  it('should support custom commmands returning a table/array', () => {
    const luaCode = 'return {10, 100, 200}';
    const redis = new MockRedis();
    const definition = { numberOfKeys: 0, lua: luaCode };
    return redis
      .defineCommand('someCmd', definition)
      .then(() => redis.someCmd())
      .then(val => expect(val).toEqual([10, 100, 200]));
  });

  it('should support custom commmands returning a table/array of table/array elements', () => {
    const luaCode = 'return {{10}, {100, 200}, {}}';
    const redis = new MockRedis();
    const definition = { numberOfKeys: 0, lua: luaCode };
    return redis
      .defineCommand('someCmd', definition)
      .then(() => redis.someCmd())
      .then(val => expect(val).toEqual([[10], [100, 200], []]));
  });
});
