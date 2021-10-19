const util = require('util')

class TTRelation {

    constructor(redis, config){
        this.prefix = config.redis_prefix
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

module.exports = TTRelation
