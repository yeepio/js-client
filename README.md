# Yeep JavaScript Client

Yeep API client for Node.js and the browser.

[![Build Status](https://travis-ci.com/yeepio/js-client.svg?branch=master)](https://travis-ci.com/yeepio/js-client) [![Greenkeeper badge](https://badges.greenkeeper.io/yeepio/js-client.svg)](https://greenkeeper.io/)

#### Features

- Supports promises + async/await.

## Installation

```
$ npm install yeep
```

#### Requirements

- Node.js v.6+

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
