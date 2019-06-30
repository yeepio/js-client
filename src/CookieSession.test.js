/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import YeepClient from './YeepClient';
import CookieSession from './CookieSession';
import openapi from './__tests__/openapi.json';

const mock = new MockAdapter(axios);
mock.onGet('/api/docs').reply(200, openapi);

describe('CookieSession', () => {
  const client = new YeepClient({
    baseURL: 'http://demo.yeep.com',
  });

  describe('constructor', () => {
    test('throws error when param is missing', () => {
      expect(() => new CookieSession()).toThrow(TypeError);
    });

    test('throws error when client param is not a YeepClient', () => {
      expect(() => new CookieSession(false)).toThrow(TypeError);
      expect(() => new CookieSession('abc')).toThrow(TypeError);
      expect(() => new CookieSession(123)).toThrow(TypeError);
      expect(() => new CookieSession(noop)).toThrow(TypeError);
      expect(() => new CookieSession(null)).toThrow(TypeError);
      expect(() => new CookieSession({})).toThrow(TypeError);
    });

    test('contructs and returns new CookieSession instance', () => {
      const session = new CookieSession(client);
      expect(session).toBeInstanceOf(CookieSession);
    });
  });

  describe('login()', () => {
    const session = new CookieSession(client);

    afterAll(async () => {
      mock.onPost('/api/session.destroyCookie').replyOnce(200, {
        ok: 'true',
      });
      await session.logout();
    });

    test('throws error when `props` param is missing', () => {
      expect(session.login()).rejects.toThrow(TypeError);
    });

    test('throws error when `props` param is not an object', () => {
      expect(session.login(false)).rejects.toThrow(TypeError);
      expect(session.login('abc')).rejects.toThrow(TypeError);
      expect(session.login(123)).rejects.toThrow(TypeError);
      expect(session.login(noop)).rejects.toThrow(TypeError);
      expect(session.login(null)).rejects.toThrow(TypeError);
    });

    test('throws error when `user` property is missing', () => {
      expect(session.login({})).rejects.toThrowError(/Invalid "user" property/);
    });

    test('throws error when `password` property is missing', () => {
      expect(
        session.login({
          user: 'coyote',
        })
      ).rejects.toThrowError(/Invalid "password" property/);
    });

    test('sets session cookie', async () => {
      mock.onPost('/api/session.setCookie').replyOnce(200, {
        ok: 'true',
        user: {
          id: 'xxx',
        },
      });
      await session.login({
        user: 'coyote',
        password: 'catch-the-b1rd$',
      });
    });
  });

  describe('logout()', () => {
    const session = new CookieSession(client);

    test('destroys session token and cancels next refresh', async () => {
      mock.onPost('/api/session.destroyCookie').replyOnce(200, {
        ok: 'true',
      });
      await session.logout();
    });
  });
});
