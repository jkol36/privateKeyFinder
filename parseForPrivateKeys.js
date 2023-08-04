
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

const parseForPrivateKeys = (data) => {
  //console.log('parsing for private keys')
    let regex = /16([a-zA-Z]+([0-9]+[a-zA-Z]+)+)9/g; //for identifying private keys
    let regex2 = /[0-9]+([a-zA-Z]+([0-9]+[a-zA-Z]+)+)/g; // also for identifying private keys
    
  let regex3 = new RegExp(/^[a-f0-9]{64}$/i);
   
    let regexs = [regex, regex2, regex3]
    
    let privateKeys = []
    const privateKeyPrefixes = ['PRIVATE_KEY',"privateKey: ","CHALLENGER_KEY", "LIQUIDITY_PROVIDER_KEY", "SANCTIONED_USER", "privateKey","cypherText", "bigIntegerToBytes", "hexDigest", "wireguard", "this_.privateKey", "privateToAddress","cypher", "address", "Address", "Address=", "wallet", "account", "seed", "seed=", "privkey", "hexString","priv",'ETHEREUM_PRIVATE_KEY', 'WALLET', 'METAMASK_PRIVATE_KEY'] // these are variable name variations ive seen out in the wild people are using when naming their private key variables.
    const initialHits = privateKeyPrefixes.map(prefix => ({match: data.match(prefix, 'g'), prefix}))
    let tmpPrivateKeys
    try {
        tmpPrivateKeys = initialHits.filter(hit => hit.match !== null).map(result => {

            const {match, prefix} = result
            //console.log(prefix)
            const indexOfMatch = match['index']
            const input = match['input']
            let keyStringInitial = input.substring(indexOfMatch, indexOfMatch+64+(prefix.length+4))
            let potentialKey = clean(keyStringInitial.split(prefix)[1])
            
          privateKeys.push(potentialKey)
        
        })
    }
    catch(err){
        console.log('error with private key', err)
  
    }
    
    
   
    regexs.forEach(regexExpression => {
      const match = data.match(regexExpression)
      //console.log({match, regexExpression})
      if(match !== null) {
        match.forEach(potential => {
          privateKeys.push(potential)
        
        })
      }
     
    })
    return privateKeys
}

module.exports.parseForPrivateKeys = parseForPrivateKeys
