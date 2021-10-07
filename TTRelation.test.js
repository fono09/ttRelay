const TTRelation = require('./TTRelation.js'),
  redis = require('redis-mock'),
  config = require('config')

test('コンストラクタが機能する', () => {
  let ttr = new TTRelation(redis, config)
  console.log(config)
  expect(ttr.prefix).toBe(config.redis_prefix)
  expect(ttr.setAsync).toBeDefined()
  expect(ttr.getAsync).toBeDefined()
  expect(ttr.keysAsync).toBeDefined()
})
