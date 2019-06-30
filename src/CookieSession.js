import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import YeepClient from './YeepClient';

class CookieSession {
  constructor(client) {
    // validate input
    if (!(client instanceof YeepClient)) {
      throw new TypeError(
        `Invalid "client" param; expected instance of YeepClient, received ${typeof client}`
      );
    }

    this.client = client;
  }

  /**
   * Sets new cookie session.
   * @param {Object} props
   * @property {string} user the username or email address of the user
   * @property {string} password the user password
   * @returns {Promise<Object>}
   */
  login(props) {
    if (!isObject(props)) {
      return Promise.reject(
        new TypeError(
          `Invalid "props" argument; expected object, received ${typeof props}`
        )
      );
    }

    const { user, password } = props;
    if (!isString(user)) {
      return Promise.reject(
        new TypeError(
          `Invalid "user" property; expected string, received ${typeof user}`
        )
      );
    }
    if (!isString(password)) {
      return Promise.reject(
        new TypeError(
          `Invalid "password" property; expected string, received ${typeof password}`
        )
      );
    }

    // retrieve api object
    return this.client.api().then((api) => {
      // issue cookie session
      return api.session.setCookie({ user, password });
    });
  }

  /**
   * Destroys an existing cookie session.
   * @returns {Promise}
   */
  logout() {
    // retrieve api object
    return this.client.api().then((api) => {
      // destroy bearer session token
      return api.session.destroyCookie();
    });
  }

  /**
   * Refreshes an existing cookie session.
   * @returns {Promise}
   */
  refresh() {
    // retrieve api object
    return this.client.api().then((api) => {
      // refresh bearer session token
      return api.session.refreshCookie();
    });
  }
}

export default CookieSession;
