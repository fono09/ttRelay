const MastodonEventListenerImplement = require("./MastodonEventListenerImplement.js")

class TTRelay extends MastodonEventListenerImplement {
  
  constructor(
    twitterClient, 
    https,
    htmlDecode,
    ttRelation,
    config,
  ) {
    super()
    this.twc = twitterClient
    this.https = https
    this.htmlDecode = htmlDecode
    this.ttr = ttRelation
    this.config = config
  }
  
  httpsGet(url) { 
    return new Promise((resolve, reject) => {
      this.https.get(url, {encoding: null}, res => {
          var body = []
          res.on('data', data => body.push(data))
          res.on('end', () => resolve(Buffer.concat(body)))
          res.on('error', () => reject(e))
          })
    })
  }

  postMedia(media) {
    return new Promise((resolve, reject) => {
      this.twc.post('media/upload', {media}, (error, response) => {
        if(!error){
          resolve(response.media_id_string)
        }else{
          reject(error)
        }
      })
    })
  }

  async onUpdate(...args) {
    this.message = super.onUpdate(...args)

    let parsed_payload
    try {
      parsed_payload = JSON.parse(this.message.payload)
    } catch(e) {
      console.log('JSON.parse Error: ' + e.toString())
      return
    }
    const payload = parsed_payload

    if (
      payload.account.acct !== this.config.target_acct
      || 'tags' in payload === false
      || !payload.tags.find(e => e.name === this.config.tag)
    ) {
      return
    }


    const url_expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;

    console.log({payload})
    console.log(payload.content)

    let tweet_text = this.htmlDecode(
      payload.content
      .replace(/<br \/>/g,"\n")
      .replace(/<\/p><p>/g, "\n\n")
      .replace(/<\/?(\w+)( (\w+)="([^"]*)")*( \/)?>/g,'')
      .replace(url_expression, '')
      .replace('#' + this.config.tag, '')
    )

    const urls = payload.content
      .match(url_expression)
      .filter((value, index, array) => array.indexOf(value) === index)
      .filter(e => (new RegExp(`https://${this.config.instance_domain}/tags`)).test(e) == false)

    if(urls != null){
      tweet_text = tweet_text + "\n" + urls.join(' ')
    }
    let status_body = {status: tweet_text}


    if ('in_reply_to_id' in payload) {
      let in_reply_to_status_id = await this.ttr.get(payload.in_reply_to_id).catch(e => console.log('Error! ', e.toString()))
      status_body = Object.assign(status_body, {in_reply_to_status_id})
    }

    if('media_attachments' in payload){
      let media_ids = await Promise.all(
        payload.media_attachments.map(e =>
          this.httpsGet(e.url)
            .then(media => this.postMedia(media))
            .catch(err => console.log('MediaUpload failed', err.toString()))
          )
        )
      media_ids = media_ids.join(',')

      status_body = Object.assign(status_body, {media_ids})
    }

    this.twc.post('statuses/update', status_body, (error, tweet, response) => {
      if(!error){
        this.ttr.set(payload.id, tweet.id_str).catch(e => console.log('Error! ', e.toString()))
      }else{
        console.log('TwitterClient status/update failed', error)
      }
    })

    return
  }

  onDelete(...args) {
    this.message = super.onDelete(...args)
    const payload = this.message.payload
    console.log('Receive delete event: ' + payload)
    this.ttr.get(payload).then(res => {
      console.log('TTRelation.get res:', res)

      if(res == null){
        console.log('Relation not found, id: ' + payload)
        return
      } else {
        this.twc.post('statuses/destroy', {id: res}, (err, response) => {
          if(err == null){
            console.log('TweetDeleted', response)
          }else{
            console.log('TweetDeleteFailed', JSON.stringify(err))
          }
        })
      }
    }).catch(e => {
      console.log('Error!', e.toString())
    })
    return
  }
}

module.exports = TTRelay
