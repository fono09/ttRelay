class WatchDog {

  constructor(){
    console.log('new WatchDog')
    this.set()
  }

  set() {
    this.timeout = setTimeout(()=>{
      this.reconnect()
    }, 100000)
  }

  reset() {
    clearTimeout(this.timeout)
    this.set()
  }

  reconnect() {
    console.log('reconnect WatchDog')
    throw "Process killed by WatchDog"
  }
}

module.exports = WatchDog
