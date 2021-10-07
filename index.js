const https = require('https'),
    WebSocketClient = require('websocket').client,
    config = require('config'),
    htmlDecode = require('unescape'),
    redis = require("redis"),
    util = require('util'),
    Twitter = require('twitter'),
    TTRelation = require('./TTRelation.js')

TARGET_ACCT =  config.target_acct

class WatchDog {

    constructor(){
        console.log('new WatchDog')
        session(this)
        this.set()
    }

    set(){
        this.timeout = setTimeout(()=>{
            this.reconnect()
        }, 100000)
    }

    reset(){
        clearTimeout(this.timeout)
        this.set()
    }

    reconnect(){
        console.log('reconnect WatchDog')
        throw "Process killed by WatchDog"
    }
}

var session = (wd) => {
    
    let twc = new Twitter({
        consumer_key: config.consumer_key,
        consumer_secret: config.consumer_secret,
        access_token_key: config.access_token_key,
        access_token_secret: config.access_token_secret
    })
    let wsc = new WebSocketClient()
    let ttr = new TTRelation(redis, config)
    
    wsc.on('connectFailed', e => {
        console.log('Connection Error: ' + e.toString())
    })

    wsc.on('connect', connection => {

        connection.on('error', e => {
            console.log('Connection Error: ' + e.toString())
        })

        connection.on('close', () => {
            console.log('Connection Closed')
            wd.reconnect()
        })

        connection.on('ping', (cancel, data) => {
            wd.reset()
        })

        connection.on('message', async (m) => {
            wd.reset()


            if(m.type !== 'utf8'){
                return
            }

            var wsEvent
            try {
                wsEvent = JSON.parse(m.utf8Data)
            } catch (e) {
                console.log('JSON.parse Error: ' + e.toString())
                wsEvent = null
            }
             
            if(wsEvent.event == 'delete'){
                var payload = wsEvent.payload
                console.log('Receive delete event: ' + payload)
                ttr.get(payload)
                    .then(res => {
                        console.log('TTRelation.get res:', res)
                        
                        if(res == null){
                            console.log('Relation not found, id: ' + payload)
                            return
                        }else{
                            twc.post('statuses/destroy', {id: res}, (err, response) => {
                                if(err == null){
                                    console.log('TweetDeleted', response)
                                }else{
                                    console.log('TweetDeleteFailed', JSON.stringify(err))
                                }
                            })
                        }
                    })
                    .catch(e => {
                        console.log('Error!', e.toString())
                    })
                return
            }

            if(wsEvent == null || wsEvent.event != 'update'){
                return
            }
            
            var payload
            try {
                payload = JSON.parse(wsEvent.payload)
            } catch (e) {
                console.log('JSON.parse Error: ' + e.toString())
                payload = null
            }
            if(payload == null){
                return
            }
            
            if(payload.account.acct != TARGET_ACCT){
                return
            }

            if('tags' in payload == false){
                return
            }

            if(payload.tags.find(e => e.name == config.tag) == undefined){
                return
            }

            var url_expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;

            console.log({payload})
            console.log(payload.content)

            var tweet_text = htmlDecode(
              payload.content
                .replace(/<br \/>/g,"\n")
                .replace(/<\/p><p>/g, "\n\n")
                .replace(/<\/?(\w+)( (\w+)="([^"]*)")*( \/)?>/g,'')
                .replace(url_expression, '')
                .replace('#' + config.tag, '')
            )

            var urls = payload.content.match(url_expression).filter((value, index, array) => array.indexOf(value) === index).filter(e => (new RegExp(`https://${config.instance_domain}/tags`)).test(e) == false)

            if(urls != null){
                tweet_text = tweet_text + "\n" + urls.join(' ')
            }
            var status_body = {status: tweet_text}


            var https_get = url => new Promise((resolve, reject) => {
                https.get(url, {encoding: null}, res => {
                    var body = []
                    res.on('data', data => body.push(data))
                    res.on('end', () => resolve(Buffer.concat(body)))
                    res.on('error', () => reject(e))
                })
            })

            var post_media = media => new Promise((resolve, reject) => {
                twc.post('media/upload', {media}, (error, response) => {
                    if(!error){
                        resolve(response.media_id_string)
                    }else{
                        reject(error)
                    }
                })
            })

            var media_ids
            if('media_attachments' in payload){
                media_ids = await Promise.all(
                    payload.media_attachments.map(e =>
                        https_get(e.url)
                            .then(media => post_media(media))
                            .catch(err => console.log('MediaUpload failed', err.toString()))
                    )
                )
                media_ids = media_ids.join(',')

                status_body = Object.assign(status_body, {media_ids})
            }

            twc.post('statuses/update', status_body, (error, tweet, response) => {
                if(!error){
                    ttr.set(payload.id, tweet.id_str).then(redis.print).catch(e => console.log('Error! ', e.toString()))
                }else{
                    console.log('TwitterClient status/update failed', error)
                }
            })
        })
    })

    wsc.connect('wss://'+ config.instance_domain + '/api/v1/streaming?access_token=' + config.mastodon_access_token + '&stream=user', null)
}

var wd = new WatchDog()
