class WsSession {

  constructor(
    webSocketClient,
    watchDog,
    messageProcessor,
    config
  ) {
    this.wsc = webSocketClient
    this.wd = watchDog
    this.mp = messageProcessor
    this.config = config

    // aliases
    this.onError = this.onConnectFailed

    const Events = ['error', 'close', 'ping', 'message']

    // setup handler
    this.wsc.on('connectFailed', this.onConnectFailed)
    this.wsc.on('connect', connection => {
      Events.forEach(event_name => {
        const method_name = 'on' + event_name.substring(0, 1).toUpperCase() + event_name.substring(1)
        connection.on(event_name, (...args) => {this[method_name](...args)})
      })
    })
  }

  connect() {
    this.wsc.connect('wss://'+ this.config.instance_domain + '/api/v1/streaming?access_token=' + this.config.mastodon_access_token + '&stream=user', null)
  }

  onConnectFailed(e) {
    console.log('Connection Error: ' + e.toString())
  }

  onClose() {
    console.log('Connection Closed')
    this.wd.recoonect()
  }

  onPing() {
    console.log('pong')
    this.wd.reset()
  }

  onMessage(message) {
    this.wd.reset()
    this.mp.process(message)
  }

}

module.exports = WsSession
