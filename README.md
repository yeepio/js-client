# Yeep JavaScript Client

Yeep API client for Node.js and the browser.

[![Build Status](https://travis-ci.com/yeepio/js-client.svg?branch=master)](https://travis-ci.com/yeepio/js-client)
[![npm version](https://img.shields.io/npm/v/@yeep/client.svg?style=flat-square)](https://www.npmjs.com/package/@yeep/client)

#### Features

- Works on Node.js v.6+ or any modern browser (supports ie11);
- Exposes promise-based API;
- Matches Yeep API methods, one-to-one.

## Installation

```
$ npm install @yeep/client
```

## Quick start

Create new yeep client.

```javascript
const YeepClient = require('@yeep/client');

const yeep = new YeepClient({
  baseUrl: 'https://yeep.acme.com', // replace this with your own domain
});

yeep
  .api()
  .then((api) => {
    return api.session.create({
      user: 'coyote@acme.com',
      password: 'catch-the-b1rd$',
    });
  })
  .then((data) => {
    // do something with session data
  })
  .catch((err) => {
    // handle error
  });
```

## License

Apache 2.0
