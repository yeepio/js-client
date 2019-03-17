/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import YeepClient from '../YeepClient';
import openapi from './openapi.json';

const mock = new MockAdapter(axios);
mock.onGet('/api/docs').reply(200, openapi);

describe('YeepClient', () => {
  describe('constructor', () => {
    test('throws error when `props` param is missing', () => {
      expect(() => new YeepClient()).toThrow(TypeError);
    });

    test('throws error when `props` param is not an object', () => {
      expect(() => new YeepClient(false)).toThrow(TypeError);
      expect(() => new YeepClient('abc')).toThrow(TypeError);
      expect(() => new YeepClient(123)).toThrow(TypeError);
      expect(() => new YeepClient(noop)).toThrow(TypeError);
      expect(() => new YeepClient(null)).toThrow(TypeError);
    });

    test('throws error when `baseUrl` property is missing', () => {
      expect(() => new YeepClient({})).toThrowError(
        /Invalid "baseUrl" property/
      );
    });

    test('contructs and returns new YeepClient instance', () => {
      expect(
        new YeepClient({
          baseUrl: 'http://demo.yeep.com',
        })
      ).toBeInstanceOf(YeepClient);
    });
  });

  describe('api()', () => {
    const client = new YeepClient({
      baseUrl: 'http://demo.yeep.com',
    });

    test('generates api based on API docs and memoizes response', async () => {
      const api = await client.api();
      expect(api).toMatchObject({
        version: openapi.info.version,
        user: {
          list: expect.any(Function),
        },
      });
      expect(client.api()).resolves.toBe(api);
    });
  });
});
