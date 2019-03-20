/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import YeepClient from '../YeepClient';
import openapi from './openapi.json';
import YeepError from '../YeepError';

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

    test('maps API methods, e.g. api.role.info()', async () => {
      mock.onPost('/api/role.info').replyOnce(200, {
        ok: true,
        role: {
          id: '507f191e810c19729de860ea',
          name: 'acme:manager',
          description: 'Manager role',
          permissions: ['327f191e810c19729de76232'],
          scope: '5b2d649ce248cb779e7f26e2',
          isSystemRole: false,
          createdAt: '2017-07-13T05:00:42.145Z',
          updatedAt: '2017-07-13T05:42:42.222Z',
        },
      });

      const api = await client.api();
      const response = await api.role.info({
        id: '507f191e810c19729de860ea',
      });

      expect(response).toMatchObject({
        ok: true,
        role: {
          id: '507f191e810c19729de860ea',
          name: 'acme:manager',
          description: 'Manager role',
          permissions: ['327f191e810c19729de76232'],
          scope: '5b2d649ce248cb779e7f26e2',
          isSystemRole: false,
          createdAt: '2017-07-13T05:00:42.145Z',
          updatedAt: '2017-07-13T05:42:42.222Z',
        },
      });
    });

    test('handles network error', async () => {
      mock.onPost('/api/role.info').networkErrorOnce();

      const api = await client.api();

      expect(
        api.role.info({
          id: '507f191e810c19729de860ea',
        })
      ).rejects.toThrow(/network error/i);
    });

    test('handles timout errors', async () => {
      mock.onPost('/api/role.info').timeoutOnce();

      const api = await client.api();

      expect(
        api.role.info({
          id: '507f191e810c19729de860ea',
        })
      ).rejects.toThrow(/timeout/i);
    });

    test('handles validation errors', async () => {
      mock.onPost('/api/role.info').replyOnce(200, {
        ok: false,
        error: {
          code: 400,
          message: 'Invalid request body',
          details: [
            {
              path: ['id'],
              type: 'any.required',
            },
          ],
        },
      });

      try {
        const api = await client.api();
        await api.role.info();
      } catch (err) {
        expect(err).toBeInstanceOf(YeepError);
        expect(err).toMatchObject({
          code: 400,
          message: 'Invalid request body',
          details: [
            {
              path: ['id'],
              type: 'any.required',
            },
          ],
        });
      }
    });

    test('handles logic errors', async () => {
      mock.onPost('/api/role.info').replyOnce(200, {
        ok: false,
        error: {
          code: 10003,
          message: 'foo',
        },
      });

      try {
        const api = await client.api();
        await api.role.info({
          id: '507f191e810c19729de860ea',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(YeepError);
        expect(err).toMatchObject({
          code: 10003,
          message: 'foo',
        });
      }
    });
  });
});
