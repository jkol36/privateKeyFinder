const ccxt = require("ccxt")
const Promise = require('bluebird')
const testBinanceKeys = async keys => {
	if(keys.length > 0) {
	  console.log("trying apiKey and Secret on Binance", keys)
	}
   

    return Promise.each(keys, async combo => {

        try {
            let binance = new ccxt.binance(combo)
            let balance = await binance.fetchBalance()
            const {free} = balance
            console.log(free)
            console.log('worked', combo)
            let cryptos = Object.keys(free).map(k => {
                let balanceForCrypto = free[k]
                if(balanceForCrypto > 0) {
                    return {crypto: k, balance: free[k]}
                }
                else {
                    return null
                }
            }).filter(item => item !== null)
          }
	   catch(err){console.log(err)}
    })

}

module.exports.testBinanceKeys = testBinanceKeys;
