import crypto from 'node:crypto'
import qs from 'node:querystring'
import got from 'got'
import OAuth from 'oauth-1.0a'

const readline = require('node:readline').createInterface({
  input: process.stdin,
  output: process.stdout,
})

// The code below sets the consumer key and consumer secret from your environment variables
// To set environment variables on macOS or Linux, run the export commands below from the terminal:
// export CONSUMER_KEY='YOUR-KEY'
// export CONSUMER_SECRET='YOUR-SECRET'
const consumer_key = process.env.X_CONSUMER_KEY as string
const consumer_secret = process.env.X_CONSUMER_SECRET as string

// Be sure to add replace the text of the with the text you wish to Tweet.
// You can also add parameters to post polls, quote Tweets, Tweet with reply settings, and Tweet to Super Followers in addition to other features.
const data = {
  text: 'A serene Zen garden with carefully placed rocks and raked sand by runwayml/stable-diffusion-v1-5',
  media: {},
}

const endpointURL = 'https://api.twitter.com/2/tweets'

// this example uses PIN-based OAuth to authorize the user
const requestTokenURL =
  'https://api.twitter.com/oauth/request_token?oauth_callback=oob&x_auth_access_type=write'
const authorizeURL = new URL('https://api.twitter.com/oauth/authorize')
const accessTokenURL = 'https://api.twitter.com/oauth/access_token'
const oauth = new OAuth({
  consumer: {
    key: consumer_key,
    secret: consumer_secret,
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) =>
    crypto.createHmac('sha1', key).update(baseString).digest('base64'),
})

async function input(prompt: any) {
  return new Promise(async (resolve, _reject) => {
    readline.question(prompt, (out: any) => {
      readline.close()
      resolve(out)
    })
  })
}

async function requestToken() {
  const authHeader = oauth.toHeader(
    oauth.authorize({
      url: requestTokenURL,
      method: 'POST',
    })
  )

  const req = await got.post(requestTokenURL, {
    headers: {
      Authorization: authHeader.Authorization,
    },
  })

  if (!req.body) {
    throw new Error('Cannot get an OAuth request token')
  }
  return qs.parse(req.body)
}

async function accessToken({ oauth_token, oauth_token_secret }: any, verifier: string) {
  const authHeader = oauth.toHeader(
    oauth.authorize({
      url: accessTokenURL,
      method: 'POST',
    })
  )
  const path = `https://api.twitter.com/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`
  const req = await got.post(path, {
    headers: {
      Authorization: authHeader.Authorization,
    },
  })

  if (!req.body) {
    throw new Error('Cannot get an OAuth request token')
  }
  return qs.parse(req.body)
}

async function getRequest({ oauth_token, oauth_token_secret }: any) {
  const token = {
    key: oauth_token,
    secret: oauth_token_secret,
  }

  const authHeader = oauth.toHeader(
    oauth.authorize(
      {
        url: endpointURL,
        method: 'POST',
      },
      token
    )
  )

  const req = await got.post(endpointURL, {
    json: data,
    responseType: 'json',
    headers: {
      Authorization: authHeader.Authorization,
      'user-agent': 'v2CreateTweetJS',
      'content-type': 'application/json',
      accept: 'application/json',
    },
  })
  if (!req.body) {
    throw new Error('Unsuccessful request')
  }
  return req.body
}

export async function run() {
  try {
    // Get request token
    const oAuthRequestToken = await requestToken()
    // Get authorization
    authorizeURL.searchParams.append('oauth_token', oAuthRequestToken.oauth_token as string)
    console.log('Please go here and authorize:', authorizeURL.href)
    const pin = (await input('Paste the PIN here: ')) as string
    // Get the access token
    const oAuthAccessToken = await accessToken(oAuthRequestToken, pin.trim())
    // Make the request
    const response = await getRequest(oAuthAccessToken)
    console.dir(response, {
      depth: null,
    })
  } catch (e) {
    console.log(e)
    process.exit(-1)
  }
  process.exit()
}
