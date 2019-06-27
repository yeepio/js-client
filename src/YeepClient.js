import axios from 'axios';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import memoize from 'lodash/memoize';
import set from 'lodash/set';
import partial from 'lodash/partial';
import isNode from 'detect-node';
import jwtDecode from 'jwt-decode';
import YeepError from './YeepError';

class YeepClient {
  constructor(props) {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { baseURL, authType = 'bearer' } = props;

    if (!isString(baseURL)) {
      throw new TypeError(
        `Invalid "baseURL" property; expected string, received ${typeof baseURL}`
      );
    }

    if (!isString(authType)) {
      throw new TypeError(
        `Invalid "authType" property; expected string, received ${typeof authType}`
      );
    }
    if (authType !== 'cookie' && authType !== 'bearer') {
      throw new TypeError(
        `Invalid "authType" value; expected one of "cookie" or "bearer"`
      );
    }

    // set axios options
    const options = {
      baseURL,
    };

    if (authType === 'cookie') {
      options.withCredentials = true;
    }

    // use http and https native modules when running in node.js
    if (isNode) {
      const http = require('http');
      options.httpAgent = new http.Agent({ keepAlive: true });
      const https = require('https');
      options.httpsAgent = new https.Agent({ keepAlive: true });
    }

    this.client = axios.create(options);
    this.session = {
      type: authType,
      token: '',
      expiresAt: new Date(0),
    };
  }

  getHeaders() {
    const headers = {};

    if (this.session.token && this.session.type === 'bearer') {
      headers.Authorization = `Bearer ${this.session.token}`;
    }

    return headers;
  }

  request = async (ctx, props = {}) => {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { cancelToken, ...otherProps } = props;

    const response = await this.client.request({
      method: ctx.method,
      url: ctx.path,
      headers: this.getHeaders(),
      data: otherProps,
      cancelToken,
    });

    const { data } = response;

    if (!data.ok) {
      throw new YeepError(
        data.error.message,
        data.error.code,
        data.error.details
      );
    }

    return data;
  };

  api = memoize(async () => {
    // retrieve API docs (i.e. open api v3 specfile)
    const response = await this.client.request({
      method: 'get',
      url: '/api/docs',
    });

    // create api object
    const api = {
      version: response.data.info.version,
    };

    // decorate api object
    const pathObj = response.data.paths;
    for (const path in pathObj) {
      if (pathObj[path].post) {
        const operationObj = pathObj[path].post;
        set(
          api,
          operationObj.operationId,
          partial(this.request, {
            method: 'post',
            path,
          })
        );
      }
    }

    // return api object
    return api;
  });

  /**
   * Creates new session.
   * @param {Object} props
   * @property {string} user the username or email address of the user
   * @property {string} password the user password
   * @returns {Promise<Object>}
   */
  async createSession(props) {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { user, password } = props;
    if (!isString(user)) {
      throw new TypeError(
        `Invalid "user" property; expected string, received ${typeof user}`
      );
    }
    if (!isString(password)) {
      throw new TypeError(
        `Invalid "password" property; expected string, received ${typeof password}`
      );
    }

    // retrieve api object
    const api = await this.api();

    // set cookie session token
    if (this.session.type === 'cookie') {
      const response = await api.session.setCookie(props);
      return response;
    }

    // issue bearer session token
    const response = await api.session.issueToken(props);
    const { token, expiresAt } = response;
    this.session.token = token;
    this.session.expiresAt = new Date(expiresAt);

    const decoded = jwtDecode(token);
    return decoded.payload;
  }

  /**
   * Destroys an existing session session.
   * @returns {Promise}
   */
  async destroySession() {
    // retrieve api object
    const api = await this.api();

    // destroy cookie session token
    if (this.session.type === 'cookie') {
      const response = await api.session.destroyCookie();
      return response;
    }

    if (!this.session.token) {
      throw new Error(
        "Session token not found; it doesn't make sense to call destroySession() if you don't have an active session"
      );
    }

    // destroy bearer session token
    await api.session.destroyToken({
      token: this.session.token,
    });

    this.session.token = '';
    this.session.expiresAt = new Date(0);
  }

  /**
   * Hydrates session state.
   * This method is NOT applicable when authType is "cookie".
   * @param {Object} props
   * @property {string} token the session token
   */
  hydrateSession(props) {
    if (this.session.type === 'cookie') {
      throw new Error(
        'You cannot hydrate the session state with session type is "cookie"'
      );
    }

    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { token } = props;
    if (!isString(token)) {
      throw new TypeError(
        `Invalid "token" property; expected string, received ${typeof token}`
      );
    }

    const decoded = jwtDecode(token);
    this.session.token = token;
    this.session.expiresAt = new Date(decoded.exp * 1000);
  }
}

export default YeepClient;
