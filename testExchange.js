const ccxt = require("ccxt")

const API_KEY = "XBVtcbAfK7119GAXaXra47lBXA8sfcANKNu2sja7VbC1PiCZ0OUms5HnGRWvJLlo"
const SECRET_KEY = "ZESxhBWQqO9AsqW7spC7251ibR35ERIZNxZ3PoNooRcT55DFzGphsYYBRevTDci6"

const exchange = new ccxt.binance({apiKey:API_KEY, secret: SECRET_KEY})
exchange.fetchBalance().then(console.log)
