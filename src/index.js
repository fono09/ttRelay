const WebSocketClient = require('websocket').client,
    config = require('config'),
    redis = require("redis"),
    util = require('util'),
    https = require('https'),
    htmlDecode = require('unescape')

const TTRelation = require('./TTRelation.js')
    WatchDog = require('./WatchDog.js')
    WsSession = require('./WsSession.js')
    MastodonEventDispatcher = require('./MastodonEventDispatcher.js')
    TTRelay = require('./TTRelay.js')
    TwitterClient = require('./TwitterClient.js')

TARGET_ACCT =  config.target_acct

wss = new WsSession(
  new WebSocketClient(),
  new WatchDog(),
  new MastodonEventDispatcher(
    new TTRelay(
      new TwitterClient(config),
      https,
      htmlDecode,
      new TTRelation(redis, config),
      config,
    )
  ),
  config
).connect()
