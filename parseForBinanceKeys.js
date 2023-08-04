const ccxt = require("ccxt")
const unique = array => {
    return array.filter((a, b) => array.indexOf(a) ===b)
  }
const clean = string => {
    return string
        .replace(/\s/g, "")
        .replace(/['"]+/g, '')
        .replace(/['']+/g, '')
        .replace(/['=']+/g, '')
        .replace(/[':']+/g, '')
        .replace(/['//']+/g, '')
  }
const initSecretKeyPrefixes = () => {
    const secretKeyPrefixes = ['secret', 'sec', 'SEC', 'secret_key', 'api_secret', 'API_SECRET', 'SECRET_KEY', 'SECRET', 'apiSecret', 'binanceSecret', 'BINANCE_SECRET_KEY', 'binanceSecretKey', 'BINANCE_SECRET', 'APISECRET'] // these are variable name variations ive seen out in the wild people are using when naming their api key variables.
                              // I'm using these as a way to identify api keys in peoples code.

    const exchangeSecretKeyPrefixes = ccxt.exchanges.map(item => {
      return [`${item}_secret_key`, `${item.toUpperCase()}_SECRET`, `${item}SecretKey`, `${item}secretKey`, `${item.toUpperCase()}_SECRET_KEY`, `${item}secret`, `${item}Secret`]
    })
    return [secretKeyPrefixes, ...exchangeSecretKeyPrefixes]
}
const initApiKeyPrefixes = () => {
    const apiKeyPrefixes = ['apiKey', 'key', 'KEY', 'api_key', 'BINANCE_API_KEY', 'API_KEY', 'APIKEY'] // these are variable name variations ive seen out in the wild people are using when naming their api key variables.
                              // I'm using these as a way to identify api keys in peoples code.

    const exchangeApiKeyPrefixes = ccxt.exchanges.map(item => {
      return [
        `${item}_api_key`,
        `${item}_API_KEY`,
        `${item}ApiKey`,
        `${item}Key`,
        `${item.toUpperCase()}_api_key`,
        `${item.toUpperCase()}_API_KEY`,
        `${item.toUpperCase()}ApiKey`,
        `${item.toUpperCase()}Key`
      ]
    })
    return [apiKeyPrefixes, ...exchangeApiKeyPrefixes]
  }


function parseForBinanceKeys(data) {
    const apiKeyPrefixes = initApiKeyPrefixes().reduce((a, b) => [...a, ...b])
    const secretKeyPrefixes = initSecretKeyPrefixes().reduce((a, b) => [...a, ...b])


    const initialHits = apiKeyPrefixes.map(prefix => ({match: data.match(prefix, 'g'), prefix}))
    //console.log(initialHits.filter(item => item.match !== null))
    let initialHitsForSecrets = secretKeyPrefixes.map(prefix => ({match: data.match(prefix), prefix}))
    let tmpTokens
    let tmpSecrets
    try {
        tmpTokens = initialHits.filter(hit => hit.match !== null).map(result => {

            const {match, prefix} = result
            const indexOfMatch = match['index']
            const input = match['input']
            let keyStringInitial = input.substring(indexOfMatch, indexOfMatch+64+(prefix.length+4))
            let potentialKey = clean(keyStringInitial.split(prefix)[1])
            if(potentialKey.length === 64) {
                return potentialKey
            }


        })
    }
    catch(err){
        console.log('error with tmpTokens', err)
    }
    try {
        tmpSecrets = initialHitsForSecrets.filter(hit => hit.match !== null).map(result => {
            const {match, prefix} = result
            const indexOfMatch = match['index']
            const input = match['input']
            let keyStringInitial = input.substring(indexOfMatch, indexOfMatch+64+(prefix.length+4))
            let potentialSecret = clean(keyStringInitial.split(prefix)[1])
            if(potentialSecret.length === 64) {
                return potentialSecret
            }


        })
    }
    catch(err) {
        Sentry.captureException(err)
        console.log('error getting temp secrets', err)
    }

    const tokens = unique(tmpTokens.filter(token => token !== undefined))
    const secrets = unique(tmpSecrets.filter(secret => secret !== undefined))
    const combos = tokens.map(token => secrets.map(secret => ({apiKey: token, secret}))).reduce((a, b) => [...a, ...b], [])
    console.log(tokens, secrets, combos)
    return Promise.resolve(combos)
}
module.exports.parseForBinanceKeys = parseForBinanceKeys;
