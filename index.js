var WebSocketClient = require('websocket').client
var wsc
var config = require('config')
var htmlDecode = require('unescape')


var Twitter = require('twitter')
var twc = new Twitter({
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token_key: config.access_token_key,
    access_token_secret: config.access_token_secret
})

TARGET_ACCT =  config.target_acct


var connect = () => {
    wsc = new WebSocketClient()
    wsc.on('connectFailed', e => {
        console.log('Connection Error: ' + e.toString())
    })

    wsc.on('connect', connection => {
        connection.on('error', e => {
            console.log('Connection Error: ' + e.toString())
        })

        connection.on('close', () => {
            console.log('Connection Closed')
            setTimeout(connect, 5000)
        })

        connection.on('ping', (cancel, data) => {
            console.log('Ping recieved')
        })

        connection.on('message', m => {
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
                    console.log(tweet)
                }
            })
        })
    })

    wsc.connect('wss://'+ config.instance_domain + '/api/v1/streaming?access_token=' + config.mastodon_access_token + '&stream=user', null)
}
connect()
