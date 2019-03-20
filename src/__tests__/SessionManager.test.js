/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import jwt from 'jsonwebtoken';
import YeepClient from '../YeepClient';
import openapi from './openapi.json';
import SessionManager from '../SessionManager';

const mock = new MockAdapter(axios);
mock.onGet('/api/docs').reply(200, openapi);

describe('SessionManager', () => {
  const client = new YeepClient({
    baseUrl: 'http://demo.yeep.com',
  });

  describe('constructor', () => {
    test('throws error when `client` param is missing', () => {
      expect(() => new SessionManager()).toThrow(TypeError);
    });

    test('throws error when `client` param is not an instance of YeepClient', () => {
      expect(() => new SessionManager(false)).toThrow(TypeError);
      expect(() => new SessionManager('abc')).toThrow(TypeError);
      expect(() => new SessionManager(123)).toThrow(TypeError);
      expect(() => new SessionManager(noop)).toThrow(TypeError);
      expect(() => new SessionManager(null)).toThrow(TypeError);
      expect(() => new SessionManager({})).toThrow(TypeError);
    });

    test('contructs and returns new SessionManager instance', () => {
      expect(new SessionManager(client)).toBeInstanceOf(SessionManager);
    });

    test('comes with default state', () => {
      const sessionManager = new SessionManager(client);
      expect(sessionManager.state).toMatchObject({
        accessToken: null,
        refreshToken: null,
      });
      expect(sessionManager.refreshTimeout).toBeNull();
    });
  });

  describe('login()', () => {
    const sessionManager = new SessionManager(client);
    const accessToken = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const refreshToken = `abc${Date.now()}`;
    mock.onPost('/api/session.create').reply(200, {
      ok: 'true',
      accessToken,
      refreshToken,
    });

    afterAll(async () => {
      await sessionManager.logout();
    });

    test('throws error when `props` param is missing', () => {
      expect(sessionManager.login()).rejects.toThrow(TypeError);
    });

    test('throws error when `props` param is not an object', () => {
      expect(sessionManager.login(false)).rejects.toThrow(TypeError);
      expect(sessionManager.login('abc')).rejects.toThrow(TypeError);
      expect(sessionManager.login(123)).rejects.toThrow(TypeError);
      expect(sessionManager.login(noop)).rejects.toThrow(TypeError);
      expect(sessionManager.login(null)).rejects.toThrow(TypeError);
    });

    test('throws error when `user` property is missing', () => {
      expect(sessionManager.login({})).rejects.toThrowError(
        /Invalid "user" property/
      );
    });

    test('throws error when `password` property is missing', () => {
      expect(
        sessionManager.login({
          user: 'coyote',
        })
      ).rejects.toThrowError(/Invalid "password" property/);
    });

    test('retrieves session tokens, emits "create" and schedules next refresh', async () => {
      const f = jest.fn();
      sessionManager.once('create', f);
      await sessionManager.login({
        user: 'coyote',
        password: 'catch-the-b1rd$',
      });
      expect(f).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken,
          refreshToken,
        })
      );
      expect(sessionManager.refreshTimeout).not.toBeNull();
      expect(sessionManager.state).toMatchObject({
        accessToken,
        refreshToken,
      });
    });

    test('throws error when attempting to login twice', async () => {
      expect(
        sessionManager.login({
          user: 'coyote',
          password: 'catch-the-b1rd$',
        })
      ).rejects.toThrowError(/Session token already exists/);
    });
  });

  describe('logout()', () => {
    const sessionManager = new SessionManager(client);
    mock.onPost('/api/session.destroy').reply(200, {
      ok: 'true',
    });

    test('throws error when calling logout() without having logged-in first', async () => {
      expect(
        sessionManager.logout({
          user: 'coyote',
          password: 'catch-the-b1rd$',
        })
      ).rejects.toThrowError(/Session token not found/);
    });

    test('destroys session tokens, emits "destroy" and cancels next refresh', async () => {
      await sessionManager.login({
        user: 'coyote',
        password: 'catch-the-b1rd$',
      });
      const f = jest.fn();
      sessionManager.once('destroy', f);
      await sessionManager.logout();
      expect(f).toHaveBeenCalled();
      expect(sessionManager.refreshTimeout).toBeNull();
      expect(sessionManager.state).toMatchObject({
        accessToken: null,
        refreshToken: null,
      });
    });
  });
});
