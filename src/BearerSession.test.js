/* eslint-env jest */
import noop from 'lodash/noop';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import jwt from 'jsonwebtoken';
import YeepClient from './YeepClient';
import BearerSession from './BearerSession';
import openapi from './__tests__/openapi.json';

const mock = new MockAdapter(axios);
mock.onGet('/api/docs').reply(200, openapi);

describe('BearerSession', () => {
  const client = new YeepClient({
    baseURL: 'http://demo.yeep.com',
  });

  describe('constructor', () => {
    test('throws error when param is missing', () => {
      expect(() => new BearerSession()).toThrow(TypeError);
    });

    test('throws error when client param is not a YeepClient', () => {
      expect(() => new BearerSession(false)).toThrow(TypeError);
      expect(() => new BearerSession('abc')).toThrow(TypeError);
      expect(() => new BearerSession(123)).toThrow(TypeError);
      expect(() => new BearerSession(noop)).toThrow(TypeError);
      expect(() => new BearerSession(null)).toThrow(TypeError);
      expect(() => new BearerSession({})).toThrow(TypeError);
    });

    test('contructs and returns new BearerSession instance', () => {
      const session = new BearerSession(client);
      expect(session).toBeInstanceOf(BearerSession);
      expect(session.state).toMatchObject({
        token: '',
        expiresAt: new Date(0),
      });
      expect(session.refreshTimeout).toBeNull();
    });
  });

  describe('create()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    const session = new BearerSession(client);

    afterAll(async () => {
      mock.onPost('/api/session.destroyToken').replyOnce(200, {
        ok: 'true',
      });
      await session.destroy();
    });

    test('throws error when `props` param is missing', () => {
      expect(session.create()).rejects.toThrow(TypeError);
    });

    test('throws error when `props` param is not an object', () => {
      expect(session.create(false)).rejects.toThrow(TypeError);
      expect(session.create('abc')).rejects.toThrow(TypeError);
      expect(session.create(123)).rejects.toThrow(TypeError);
      expect(session.create(noop)).rejects.toThrow(TypeError);
      expect(session.create(null)).rejects.toThrow(TypeError);
    });

    test('throws error when `user` property is missing', () => {
      expect(session.create({})).rejects.toThrowError(
        /Invalid "user" property/
      );
    });

    test('throws error when `password` property is missing', () => {
      expect(
        session.create({
          user: 'coyote',
        })
      ).rejects.toThrowError(/Invalid "password" property/);
    });

    test('retrieves session token and schedules next refresh', async () => {
      mock.onPost('/api/session.issueToken').replyOnce(200, {
        ok: 'true',
        token,
        expiresAt: new Date(decoded.exp * 1000).toString(),
      });
      await session.create({
        user: 'coyote',
        password: 'catch-the-b1rd$',
      });
      expect(session.state).toMatchObject({
        token,
        expiresAt: new Date(decoded.exp * 1000),
      });
      expect(session.refreshTimeout).not.toBeNull();
    });
  });

  describe('destroy()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    const session = new BearerSession(client);

    describe('without prior create', () => {
      test('throws error - session token not found', async () => {
        expect(session.destroy()).rejects.toThrow(/Session token not found/);
      });
    });

    describe('with prior create', () => {
      beforeAll(async () => {
        mock.onPost('/api/session.issueToken').replyOnce(200, {
          ok: 'true',
          token,
          expiresAt: new Date(decoded.exp * 1000).toString(),
        });
        await session.create({
          user: 'coyote',
          password: 'catch-the-b1rd$',
        });
      });

      test('destroys session token and cancels next refresh', async () => {
        mock.onPost('/api/session.destroyToken').replyOnce(200, {
          ok: 'true',
        });
        await session.destroy();
        expect(session.state).toMatchObject({
          token: '',
          expiresAt: new Date(0),
        });
        expect(session.refreshTimeout).toBeNull();
      });
    });
  });

  describe('hydrate()', () => {
    const token = jwt.sign({ foo: 'bar' }, 'shhhhh', {
      expiresIn: 5 * 60, // i.e. 5 mins
    });
    const decoded = jwt.decode(token);

    const session = new BearerSession(client);

    describe('without prior create', () => {
      afterAll(async () => {
        mock.onPost('/api/session.destroyToken').replyOnce(200, {
          ok: 'true',
        });
        await session.destroy();
      });

      test('hydrates session state', async () => {
        expect(() => session.hydrate({ token })).not.toThrow();
        expect(session.state).toMatchObject({
          token,
          expiresAt: new Date(decoded.exp * 1000),
        });
        expect(session.refreshTimeout).not.toBeNull();
      });
    });

    describe('with prior create', () => {
      beforeAll(async () => {
        mock.onPost('/api/session.issueToken').replyOnce(200, {
          ok: 'true',
          token,
          expiresAt: new Date(decoded.exp * 1000).toString(),
        });
        await session.create({
          user: 'coyote',
          password: 'catch-the-b1rd$',
        });
      });

      afterAll(async () => {
        mock.onPost('/api/session.destroyToken').replyOnce(200, {
          ok: 'true',
        });
        await session.destroy();
      });

      test('throws error - cannot hydrate an existing session', async () => {
        expect(() => session.hydrate({ token })).toThrowError(
          'Session token already exists; you cannot hydrate an existing session'
        );
      });
    });
  });
});
