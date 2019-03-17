import axios from 'axios';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import memoize from 'lodash/memoize';
import set from 'lodash/set';
import partial from 'lodash/partial';
import SessionManager from './SessionManager';

class YeepClient {
  constructor(props) {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { baseUrl } = props;
    if (!isString(baseUrl)) {
      throw new TypeError(
        `Invalid "baseUrl" property; expected string, received ${typeof baseUrl}`
      );
    }

    // construct axios options
    const options = {
      baseURL: baseUrl,
    };

    // use http and https native modules when running in node.js
    if (typeof module !== 'undefined' && module.exports) {
      const http = require('http');
      options.httpAgent = new http.Agent({ keepAlive: true });
      const https = require('https');
      options.httpsAgent = new https.Agent({ keepAlive: true });
    }

    this.client = axios.create(options);
  }

  static getHeaders({ accessToken }) {
    const headers = {};

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
  }

  request = async (ctx, props = {}) => {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { accessToken, cancelToken, ...otherProps } = props;

    try {
      return this.client.request({
        method: ctx.method,
        url: ctx.path,
        headers: this.constructor.getHeaders({ accessToken }),
        data: otherProps,
        cancelToken,
      });
    } catch (err) {
      if (axios.isCancel(err)) {
        throw err; // rethrow
      }

      const { data } = err.response;
      if (data.code === 400) {
        throw data.details[0];
      }

      throw data;
    }
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

  async session(props) {
    // validate input
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

    // get api client
    const api = await this.api();

    // create session with API
    const response = await api.session.create(props);

    // construct session manager
    const { accessToken, refreshToken } = response;
    return new SessionManager({
      accessToken,
      refreshToken,
      api,
    });
  }
}

export default YeepClient;
