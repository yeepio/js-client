import axios from 'axios';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import memoize from 'lodash/memoize';
import set from 'lodash/set';
import partial from 'lodash/partial';
import isNode from 'detect-node';
import YeepError from './YeepError';
import CookieSession from './CookieSession';
import BearerSession from './BearerSession';

class YeepClient {
  constructor(props) {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { baseURL, authType = isNode ? 'bearer' : 'cookie' } = props;

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

    // init axios options obj
    const options = {
      baseURL,
    };

    // set session
    switch (authType.toLowerCase()) {
      case 'cookie': {
        this.session = new CookieSession(this);
        options.withCredentials = true;
        break;
      }
      case 'bearer': {
        this.session = new BearerSession(this);
        break;
      }
      default:
        throw new TypeError(
          `Invalid "authType" value; expected one of "cookie" or "bearer"`
        );
    }

    // use http and https native modules when running in node.js
    if (isNode) {
      const http = require('http');
      options.httpAgent = new http.Agent({ keepAlive: true });
      const https = require('https');
      options.httpsAgent = new https.Agent({ keepAlive: true });
    }

    // set client
    this.client = axios.create(options);
  }

  getHeaders() {
    const headers = {};

    if (this.session instanceof BearerSession && this.session.state.token) {
      headers.Authorization = `Bearer ${this.session.state.token}`;
    }

    return headers;
  }

  request = (ctx, props = {}) => {
    if (!isObject(props)) {
      return Promise.reject(
        new TypeError(
          `Invalid "props" argument; expected object, received ${typeof props}`
        )
      );
    }

    const { cancelToken, ...otherProps } = props;

    return this.client
      .request({
        method: ctx.method,
        url: ctx.path,
        headers: this.getHeaders(),
        data: otherProps,
        cancelToken,
      })
      .then((response) => {
        const { data } = response;

        if (!data.ok) {
          throw new YeepError(
            data.error.message,
            data.error.code,
            data.error.details
          );
        }

        return data;
      });
  };

  api = memoize(() => {
    return (
      this.client
        // retrieve API docs (i.e. open api v3 specfile)
        .request({
          method: 'get',
          url: '/api/docs',
        })
        .then((response) => {
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
        })
    );
  });

  login = (props) => this.session.login(props);
  logout = () => this.session.logout();
}

export default YeepClient;
