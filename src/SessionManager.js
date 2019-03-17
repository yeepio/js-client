import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import EventEmitter from 'eventemitter3';
import jwtDecode from 'jwt-decode';
import isNode from 'detect-node';

class SessionManager extends EventEmitter {
  constructor(props) {
    super();

    // validate input
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { api, accessToken, refreshToken } = props;
    if (!isObject(api)) {
      throw new TypeError(
        `Invalid "api" property; expected object, received ${typeof api}`
      );
    }
    if (!isString(accessToken)) {
      throw new TypeError(
        `Invalid "accessToken" property; expected string, received ${typeof accessToken}`
      );
    }
    if (!isString(refreshToken)) {
      throw new TypeError(
        `Invalid "refreshToken" property; expected string, received ${typeof refreshToken}`
      );
    }

    // set context
    this.context = {
      api,
    };

    // set state
    this.state = {
      accessToken,
      refreshToken,
    };

    // set next refresh
    const decoded = jwtDecode(this.state.accessToken);
    this.scheduleNextRefresh(decoded * 1000 - Date.now());

    // add visibilitychange listener (browser-only)
    if (!isNode) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }
  }

  handleVisibilityChange = () => {
    if (!document.hasFocus) {
      this.cancelNextRefresh();
      return; // exit
    }

    if (this.refreshTimeout === null) {
      this.scheduleNextRefresh(0);
    }
  };

  async refresh() {
    // refresh session with API
    const { api } = this.context;
    const response = await api.session.refresh(this.state);

    // update state
    const { accessToken, refreshToken } = response;
    this.state = {
      accessToken,
      refreshToken,
    };

    // emit event
    this.emit('refresh', this.state);

    // set next refresh
    const decoded = jwtDecode(this.state.accessToken);
    this.scheduleNextRefresh(decoded * 1000 - Date.now());
  }

  scheduleNextRefresh(ms) {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      this.refresh().catch((err) => {
        this.emit('error', err);
        this.scheduleNextRefresh((ms || 300) * 2); // call refresh again with delay
      });
    }, ms);
  }

  cancelNextRefresh() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = null;
  }

  async destroy() {
    // destroy session with API
    const { api } = this.context;
    await api.session.destroy(this.state);

    // cancel next refresh
    this.cancelNextRefresh();

    // emit event
    this.emit('destroy');

    // remove visibilitychange listener (browser-only)
    if (!isNode) {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }
  }
}

export default SessionManager;
