var WebSocketClient = require('websocket').client,
    wsc,
    config = require('config'),
    htmlDecode = require('unescape'),
    redis = require("redis"),
    ttr,
    util = require('util'),
    Twitter = require('twitter'),
    twc

TARGET_ACCT =  config.target_acct

class TTRelation {

    constructor(prefix = null){
        if(prefix == null){
            this.prefix = config.redis_prefix
        }else{
            this.prefix = prefix
        }
        var rdc = redis.createClient("redis://redis")
        rdc.on("error", err => {
            throw new Error("RedisError " + err)
        })
        this.setAsync = util.promisify(rdc.set).bind(rdc)
        this.getAsync = util.promisify(rdc.get).bind(rdc)
        this.keysAsync = util.promisify(rdc.keys).bind(rdc)
    }

    set(k,v){
        console.log('TTRelation.set key,value:', k, v)
        return this.setAsync(this.prefix + k, v, 'EX', 3600).then(() => {
            return this.list()
        })
    }

    get(k){
        console.log('TTRelation.get key:', k)
        return this.getAsync(this.prefix + k)
    }

    list(){
        return this.keysAsync('*')
    }

}

class WatchDog {

    constructor(){
        console.log('new WatchDog')
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
        setTimeout(connect, 5000)
    }
}


var connect = () => {

    twc = new Twitter({
        consumer_key: config.consumer_key,
        consumer_secret: config.consumer_secret,
        access_token_key: config.access_token_key,
        access_token_secret: config.access_token_secret
    })
    wd = new WatchDog()
    wsc = new WebSocketClient()
    ttr = new TTRelation()

    wsc.on('connectFailed', e => {
        console.log('Connection Error: ' + e.toString())
        wd.reconnect()
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

        connection.on('message', m => {
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

            if(payload.tags.find(e => e.name == 'ttr') == undefined){
                return
            }

            var url_expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;

            var tweet_text = htmlDecode(payload.content.replace(/<br \/>/,"\n").replace(/<\/?(\w+)( (\w+)="([^"]*)")*( \/)?>/g,'').replace(url_expression, ''))
            var urls = payload.content.match(url_expression).filter((value, index, array) => array.indexOf(value) === index).filter(e => /https:\/\/ma\.fono\.jp\/tags/.test(e) == false)

            if(urls != null){
                tweet_text = tweet_text + ' ' + urls.join(' ')
            }
            console.log(tweet_text)

            twc.post('statuses/update', {status: tweet_text}, (error, tweet, response) => {
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
connect()
