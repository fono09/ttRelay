const MastodonEventListenerImplement = require("./MastodonEventListenerImplement.js")

class TTRelay extends MastodonEventListenerImplement {
  
  constructor(
    targetServiceImplements,
    https,
    htmlDecode,
    ttRelation,
    config,
  ) {
    super()
    this.tsis = targetServiceImplements
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

  async onUpdate(...args) {
    this.message = super.onUpdate(...args)

    let parsed_payload
    try {
      parsed_payload = JSON.parse(this.message.payload)
    } catch(e) {
      console.log(`JSON.parse Error: ${e.toString()}, ${this.message.payload}`)
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

    const status_text = tweet_text + "\n" + urls.join(' ')

    await Promise.all(this.tsis.map(async (tsi) => {
      const in_reply_to_id = 'in_reply_to_id' in payload ? await this.ttr.get(`${tsi.constructor.name}_${payload.in_reply_to_id}`).catch(e => console.log('Error! ', e.toString())) : null
      const media_ids = 'media_attachments' in payload ? await Promise.all(
        payload.media_attachments.map(e =>
          this.httpsGet(e.url)
            .then(media => tsi.postMedia(media))
            .catch(err => console.log('MediaUpload failed', err.toString()))
        )
      ) : null

      await tsi.post(status_text, in_reply_to_id, media_ids)
        .then(id => this.ttr.set(`${tsi.constructor.name}_${payload.id}`, id))
        .catch(e => console.log('Error! ', e))
    }))
  }

  async onDelete(...args) {
    this.message = super.onDelete(...args)
    const payload = this.message.payload
    console.log('Receive delete event: ' + payload)
    await Promise.all(this.tsis.map(tsi => {
      this.ttr.get(`${tsi.constructor.name}_${payload}`)
        .then(res => {
          console.log('TTRelation.get res:', res)
          if(res == null) {
            console.log(`Relation not found, tsi: ${tsi.constructor.name}, id: ${payload}`)
            return
          } else {
            tsi.deletePost(res).then((err, response) => {
              if(err == null) {
                console.log('PostDeleted', response)
              } else {
                console.log('PostDeleteFailed', JSON.stringify(err))
              }
            })
          }
      })
      .catch(e => {
        console.log('Error!', e.toString())
      })
    }))
  }
}

module.exports = TTRelay
