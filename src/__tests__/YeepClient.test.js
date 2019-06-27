/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import jwt from 'jsonwebtoken';
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

    test('throws error when `baseURL` property is missing', () => {
      expect(() => new YeepClient({})).toThrowError(
        /Invalid "baseURL" property/
      );
    });

    test('throws error when `authType` property is not string', () => {
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: 123,
          })
      ).toThrowError(/Invalid "authType" property/);
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: false,
          })
      ).toThrowError(/Invalid "authType" property/);
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: null,
          })
      ).toThrowError(/Invalid "authType" property/);
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: noop,
          })
      ).toThrowError(/Invalid "authType" property/);
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: {},
          })
      ).toThrowError(/Invalid "authType" property/);
    });

    test('throws error when `authType` property does not contain an allowed value', () => {
      expect(
        () =>
          new YeepClient({
            baseURL: 'http://demo.yeep.com',
            authType: 'invalid',
          })
      ).toThrowError(/Invalid "authType" value; expected one of/);
    });

    test('contructs and returns new YeepClient instance', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
      });
      expect(client).toBeInstanceOf(YeepClient);
      expect(client.session).toMatchObject({
        type: 'bearer',
        token: '',
        expiresAt: new Date(0),
      });
    });

    test('accepts "cookie" authType', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
        authType: 'cookie',
      });
      expect(client).toBeInstanceOf(YeepClient);
      expect(client.session).toMatchObject({
        type: 'cookie',
        token: '',
        expiresAt: new Date(0),
      });
    });
  });

  describe('api()', () => {
    const client = new YeepClient({
      baseURL: 'http://demo.yeep.com',
      authToken: 'bearer',
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

  describe('createSession()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    describe('bearer', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
        authToken: 'bearer',
      });
      mock.onPost('/api/session.issueToken').replyOnce(200, {
        ok: 'true',
        token,
        expiresAt: new Date(decoded.exp * 1000).toString(),
      });
      mock.onPost('/api/session.destroyToken').replyOnce(200, {
        ok: 'true',
      });

      afterAll(async () => {
        await client.destroySession();
      });

      test('throws error when `props` param is missing', () => {
        expect(client.createSession()).rejects.toThrow(TypeError);
      });

      test('throws error when `props` param is not an object', () => {
        expect(client.createSession(false)).rejects.toThrow(TypeError);
        expect(client.createSession('abc')).rejects.toThrow(TypeError);
        expect(client.createSession(123)).rejects.toThrow(TypeError);
        expect(client.createSession(noop)).rejects.toThrow(TypeError);
        expect(client.createSession(null)).rejects.toThrow(TypeError);
      });

      test('throws error when `user` property is missing', () => {
        expect(client.createSession({})).rejects.toThrowError(
          /Invalid "user" property/
        );
      });

      test('throws error when `password` property is missing', () => {
        expect(
          client.createSession({
            user: 'coyote',
          })
        ).rejects.toThrowError(/Invalid "password" property/);
      });

      test('retrieves session token and schedules next refresh', async () => {
        await client.createSession({
          user: 'coyote',
          password: 'catch-the-b1rd$',
        });
        expect(client.session).toMatchObject({
          token,
          expiresAt: new Date(decoded.exp * 1000),
        });
      });

      test('sets authorization header', async () => {
        expect(client.getHeaders()).toMatchObject({
          Authorization: `Bearer ${token}`,
        });
      });
    });
  });

  describe('destroySession()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    describe('bearer', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
        authToken: 'bearer',
      });
      mock.onPost('/api/session.issueToken').replyOnce(200, {
        ok: 'true',
        token,
        expiresAt: new Date(decoded.exp * 1000).toString(),
      });
      mock.onPost('/api/session.destroyToken').replyOnce(200, {
        ok: 'true',
      });

      describe('without prior login', () => {
        test('throws error - session token not found', async () => {
          expect(client.destroySession()).rejects.toThrow(
            /Session token not found/
          );
        });
      });

      describe('with prior login', () => {
        beforeAll(async () => {
          await client.createSession({
            user: 'coyote',
            password: 'catch-the-b1rd$',
          });
        });

        test('destroys session token and cancels next refresh', async () => {
          await client.destroySession();
          expect(client.session).toMatchObject({
            token: '',
            expiresAt: new Date(0),
          });
        });

        test('unsets authorization header', async () => {
          expect(client.getHeaders()).not.toMatchObject({
            Authorization: expect.any(String),
          });
        });
      });
    });
  });

  describe('hydrateSession()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    describe('cookie', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
        authType: 'cookie',
      });

      test('throws error - cookie session cannot be hydrated', async () => {
        expect(() => client.hydrateSession({ token })).toThrowError(
          'You cannot hydrate the session state with session type is "cookie"'
        );
      });
    });

    describe('bearer', () => {
      const client = new YeepClient({
        baseURL: 'http://demo.yeep.com',
        authType: 'bearer',
      });

      test('hydrates session state', async () => {
        expect(() => client.hydrateSession({ token })).not.toThrow();
        expect(client.session).toMatchObject({
          token,
          expiresAt: new Date(decoded.exp * 1000),
        });
      });
    });
  });
});
