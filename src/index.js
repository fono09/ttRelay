const WebSocketClient = require('websocket').client,
    config = require('config'),
    redis = require("redis"),
    util = require('util'),
    Twitter = require('twitter'),
    TTRelation = require('./TTRelation.js')
    WatchDog = require('./WatchDog.js')
    WsSession = require('./WsSession.js')
    MessageProcessor = require('./MessageProcessor.js')

TARGET_ACCT =  config.target_acct

wss = new WsSession(
  new WebSocketClient(),
  new WatchDog(),
  new MessageProcessor(
    new Twitter({
      consumer_key: config.consumer_key,
      consumer_secret: config.consumer_secret,
      access_token_key: config.access_token_key,
      access_token_secret: config.access_token_secret
    }),
    new TTRelation(redis, config),
    config,
  ),
  config
).connect()
