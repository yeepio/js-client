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

  test('is instance of SessionManager', () => {
    expect(client.session).toBeInstanceOf(SessionManager);
  });

  test('comes with default state', () => {
    expect(client.session.state).toMatchObject({
      accessToken: null,
      refreshToken: null,
    });
  });

  // describe('constructor', () => {
  //   test('throws error when `props` param is missing', () => {
  //     expect(() => new YeepClient()).toThrow(TypeError);
  //   });

  //   test('throws error when `props` param is not an object', () => {
  //     expect(() => new YeepClient(false)).toThrow(TypeError);
  //     expect(() => new YeepClient('abc')).toThrow(TypeError);
  //     expect(() => new YeepClient(123)).toThrow(TypeError);
  //     expect(() => new YeepClient(noop)).toThrow(TypeError);
  //     expect(() => new YeepClient(null)).toThrow(TypeError);
  //   });

  //   test('throws error when `baseUrl` property is missing', () => {
  //     expect(() => new YeepClient({})).toThrowError(
  //       /Invalid "baseUrl" property/
  //     );
  //   });

  //   test('contructs and returns new YeepClient instance', () => {
  //     expect(
  //       new YeepClient({
  //         baseUrl: 'http://demo.yeep.com',
  //       })
  //     ).toBeInstanceOf(YeepClient);
  //   });
  // });

  describe('login()', () => {
    const accessToken = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const refreshToken = `abc${Date.now()}`;
    mock.onPost('/api/session.create').reply(200, {
      ok: 'true',
      accessToken,
      refreshToken,
    });

    test('throws error when `props` param is missing', () => {
      expect(client.session.login()).rejects.toThrow(TypeError);
    });

    test('throws error when `props` param is not an object', () => {
      expect(client.session.login(false)).rejects.toThrow(TypeError);
      expect(client.session.login('abc')).rejects.toThrow(TypeError);
      expect(client.session.login(123)).rejects.toThrow(TypeError);
      expect(client.session.login(noop)).rejects.toThrow(TypeError);
      expect(client.session.login(null)).rejects.toThrow(TypeError);
    });

    test('throws error when `user` property is missing', () => {
      expect(client.session.login({})).rejects.toThrowError(
        /Invalid "user" property/
      );
    });

    test('throws error when `password` property is missing', () => {
      expect(
        client.session.login({
          user: 'coyote',
        })
      ).rejects.toThrowError(/Invalid "password" property/);
    });

    test('creates new session', async () => {
      const f = jest.fn();
      client.session.once('create', f);
      await client.session.login({
        user: 'coyote',
        password: 'catch-the-b1rd$',
      });
      expect(f).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken,
          refreshToken,
        })
      );
      expect(client.session.refreshTimeout).not.toBeNull();
      expect(client.session.state).toMatchObject({
        accessToken,
        refreshToken,
      });
    });
  });

  describe('logout()', () => {
    mock.onPost('/api/session.destroy').reply(200, {
      ok: 'true',
    });

    test('destroys existing session', async () => {
      const f = jest.fn();
      client.session.once('destroy', f);
      await client.session.logout();
      expect(f).toHaveBeenCalled();
      expect(client.session.refreshTimeout).toBeNull();
      expect(client.session.state).toMatchObject({
        accessToken: null,
        refreshToken: null,
      });
    });
  });
});
