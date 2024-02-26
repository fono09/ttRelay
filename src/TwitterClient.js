const { TwitterApi } = require('twitter-api-v2')
const TargetServiceImplement = require('./TargetServiceImplement.js')

class TwitterClient {
  constructor(config) {
    this.api = new TwitterApi({
      appKey: config.consumer_key,
      appSecret: config.consumer_secret,
      accessToken: config.access_token_key,
      accessSecret: config.access_token_secret
    })
  }

  async post(text, in_reply_to_id, media_ids) {
    let payload = {text}

    if (in_reply_to_id) {
      payload.reply = {in_reply_to_tweet_id: in_reply_to_id}
    }
    if (media_ids.length != 0) {
      payload.media = {media_ids}
    }

    return this.api.v2.tweet(payload).then(result => new Promise((resolve, reject) => {
      if ('errors' in result) {
        reject(result.errors)
      } else {
        resolve(result.data.id)
      }
    }))
  }

  async deletePost(id) {
    return this.api.v2.deleteTweet(id).then(result => new Promise((resolve, reject) => {
      if ('errors' in result) {
        reject(result.errors)
      } else {
        resolve(result.data.id)
      }
    }))
  }

  async postMedia(buffer) {
    const { fileTypeFromBuffer }  = await import('file-type')
    return this.api.v1.uploadMedia(buffer, { mimeType: (await fileTypeFromBuffer(buffer)).mime })
  }
}

module.exports = TwitterClient
