const MessageProcessorImplement = require('./MessageProcessorImplement.js')

class MastodonEventDispatcher extends MessageProcessorImplement {
  constructor(
    mastodonEventListener
  ) {
    super()
    this.listener = mastodonEventListener
  }

  process(...args) {
    this.message = super.process(...args)
    this
      .validateType()
      .parseAsJson()
      .dispatch()
  }

  validateType(message) {
    if(
      !this.message
      || !this.message.type
      || this.message.type !== 'utf8'
    ) {
      this.message = false
      return this
    }

    return this
  }

  parseAsJson() {
    if(!this.message) { return this }

    try {
      this.message = JSON.parse(this.message.utf8Data)
    } catch (e) {
      this.message = false
      return
    }

    return this
  }

  dispatch() {
    if (!this.message) { return this }

    if (!this.message.event) {
      this.message = false
      return this
    }
    
    const methodName = 'on'
      + this.message.event.substring(0, 1).toUpperCase()
      + this.message.event.substring(1)

    if(typeof this.listener[methodName] !== 'function') {
      console.log(`Method not found: MatodonEventDispatcher.listener.prototype.${methodName}`)
      this.message = false
      return this
    }

    return this.listener[methodName](this.message)
  }
}

module.exports = MastodonEventDispatcher
