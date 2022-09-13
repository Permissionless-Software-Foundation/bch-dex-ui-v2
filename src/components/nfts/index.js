/*
  Shows NFTs for sale on the DEX.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Card, Col, Button, Spinner } from 'react-bootstrap'
import axios from 'axios'
import Jdenticon from '@chris.troutner/react-jdenticon'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import config from '../../config'
import TokenCard from './token-card'

// Global variables and constants
const SERVER = `${config.server}/`

class NFTs extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      appData: props.appData,
      offers: [],
      iconsAreLoaded: false,
      reloadInterval: null,
      page: 0
    }

    // Bind this object to event handlers
    this.handleOffers = this.handleOffers.bind(this)
    this.handleNextPage = this.handleNextPage.bind(this)
  }

  // Executes when the component mounts.
  async componentDidMount () {
    // Retrieve initial offer data
    await this.handleOffers()

    // const oldInterval = this.state.reloadInterval
    // clearInterval(oldInterval)

    // Get data and update the table periodically.
    // const reloadInterval = setInterval(async () => {
    //   await this.handleOffers()
    // }, 30000)
    // this.setState({ reloadInterval })
  }

  render () {
    const tokenCards = this.generateCards()

    return (
      <>
        <Container>
          <Row>
            <Col xs={6}>
              <Button variant='success' onClick={this.handleOffers}>
                <FontAwesomeIcon icon={faRedo} size='lg' /> Refresh
              </Button>
            </Col>

            <Col xs={4} style={{ textAlign: 'right' }}>
              {
                this.state.iconsAreLoaded
                  ? null
                  : (<Button variant='secondary'>Loading Token Icons <Spinner animation='border' /></Button>)
              }

            </Col>

            <Col xs={2} style={{ textAlign: 'right' }} />
          </Row>
          <br />

          <Row>
            {tokenCards}
          </Row>

          <Row>
            <Col xs={6}>
              <Button variant='success' onClick={this.handleNextPage}>
                <FontAwesomeIcon icon={faRedo} size='lg' /> Load More
              </Button>
            </Col>
            <Col />
          </Row>
        </Container>
      </>
    )
  }

  async handleNextPage (event) {
    console.log('nextPage() called.')
    let nextPage = this.state.page
    nextPage++
    console.log(`nextPage: ${nextPage}`)

    // const existingOffers = this.state.offers
    // console.log('existingOffers: ', existingOffers)

    const newOffers = await this.getNftOffers(nextPage)
    // console.log('newOffers: ', newOffers)

    // Exit if there are no new offers.
    if (!newOffers.length) return

    const offers = this.combineOffers(newOffers)
    // console.log('handleNextPage combined offers: ', offers)

    this.setState({
      offers,
      page: nextPage
    })

    this.lazyLoadTokenIcons()
  }

  async handleOffers () {
    try {
      const offers = await this.getNftOffers()
      // console.log('offers: ', offers)

      this.setState({
        offers
      })

      await this.lazyLoadTokenIcons()
    } catch (err) {
      console.error('Error in handleOffers: ', err)
      // Do NOT throw errors
    }
  }

  // REST request to get Offer data from bch-dex
  async getNftOffers (page = 0) {
    try {
      const options = {
        method: 'GET',
        url: `${SERVER}offer/list/nft/${page}`,
        data: {}
      }
      const result = await axios.request(options)
      // console.log('result.data: ', result.data)

      const rawOffers = result.data

      // Add a default icon.
      // rawOffers.map(x => x.icon = (<Jdenticon size='100' value={x.tokenId} />))
      for (let i = 0; i < rawOffers.length; i++) {
        const thisOffer = rawOffers[i]

        thisOffer.icon = (<Jdenticon size='100' value={thisOffer.tokenId} />)
        thisOffer.iconDownloaded = false

        // Convert sats to BCH, and then calculate cost in USD.
        const bchjs = this.state.appData.bchWallet.bchjs
        const rateInSats = parseInt(thisOffer.rateInBaseUnit)
        // console.log('rateInSats: ', rateInSats)
        const bchCost = bchjs.BitcoinCash.toBitcoinCash(rateInSats)
        // console.log('bchCost: ', bchCost)
        // console.log('bchUsdPrice: ', this.state.appData.bchUsdPrice)
        let usdPrice = bchCost * this.state.appData.bchWalletState.bchUsdPrice * thisOffer.numTokens
        usdPrice = bchjs.Util.floor2(usdPrice)
        const priceStr = `$${usdPrice.toFixed(2)}`
        thisOffer.usdPrice = priceStr
      }

      return rawOffers
    } catch (err) {
      console.error('Error in getOffers() ', err)
      return []
    }
  }

  // This function takes in an array of new Offers and combines it with the
  // array of existing offers in the app state.
  combineOffers (serverOffers) {
    const existingOffers = this.state.offers
    const unseenOffers = []

    // console.log('existingOffers: ', existingOffers)
    // console.log('serverOffers: ', serverOffers)

    // Loop through each array. Skip the ones that already exist in the
    // existingOffers array.
    for (let i = 0; i < serverOffers.length; i++) {
      const thisOffer = serverOffers[i]
      let existingFound = false

      for (let j = 0; j < existingOffers.length; j++) {
        const existingOffer = existingOffers[j]

        // Handles the case of the server giving the same offer in two different
        // page requests.
        if (thisOffer.tokenId === existingOffer.tokenId) {
          existingFound = true
          break
        }
      }
      if (existingFound) continue

      // Add an tempory icon if this is a new Offer.
      if (!thisOffer.iconDownloaded) {
        console.log(`token ${thisOffer.tokenId} needs icon download 2`)
        // thisOffer.icon = (<Jdenticon size='100' value={thisOffer.tokenId} />)
        thisOffer.icon = (<Spinner animation='border' />)
        thisOffer.iconDownloaded = false

        // Convert sats to BCH, and then calculate cost in USD.
        const bchjs = this.state.appData.bchWallet.bchjs
        const rateInSats = parseInt(thisOffer.rateInBaseUnit)
        console.log('rateInSats: ', rateInSats)
        const bchCost = bchjs.BitcoinCash.toBitcoinCash(rateInSats)
        console.log('bchCost: ', bchCost)
        console.log('bchUsdPrice: ', this.state.appData.bchUsdPrice)
        let usdPrice = bchCost * this.state.appData.bchWalletState.bchUsdPrice * thisOffer.numTokens
        usdPrice = bchjs.Util.floor2(usdPrice)
        const priceStr = `$${usdPrice.toFixed(2)}`
        thisOffer.usdPrice = priceStr
      }

      unseenOffers.push(thisOffer)
    }

    // console.log('unseenOffers: ', unseenOffers)

    const combinedOffers = existingOffers.concat(unseenOffers)

    return combinedOffers
  }

  // This function generates a Token Card for each token in the wallet.
  generateCards () {
    // console.log('generateCards() offerData: ', offerData)

    const tokens = this.state.offers

    const tokenCards = []

    for (let i = 0; i < tokens.length; i++) {
      const thisToken = tokens[i]
      // console.log(`thisToken: ${JSON.stringify(thisToken, null, 2)}`)

      const thisTokenCard = (
        <TokenCard
          appData={this.state.appData}
          token={thisToken}
          key={`${thisToken.tokenId}`}
        />
      )
      tokenCards.push(thisTokenCard)
    }

    return tokenCards
  }

  // This function is called by the componentDidMount() lifecycle function.
  // It replaces the autogenerated token icons with proper icons, downloaded
  // from the internet.
  async lazyLoadTokenIcons () {
    const offers = this.state.offers
    // console.log(`lazy loading these tokens: ${JSON.stringify(tokens, null, 2)}`)

    const wallet = this.state.appData.bchWallet

    for (let i = 0; i < offers.length; i++) {
      const thisOffer = offers[i]
      let tokenFound = false

      // console.log(`thisOffer: ${JSON.stringify(thisOffer, null, 2)}`)

      if (!thisOffer.iconDownloaded) {
        console.log(`token ${thisOffer.tokenId} needs icon download`)
      }

      let tokenData = thisOffer.tokenData
      if (!tokenData) {
        // Get the token data from psf-slp-indexer
        tokenData = await wallet.getTokenData(thisOffer.tokenId)
      }

      // Get the token data from psf-slp-indexer
      // const tokenData = await wallet.getTokenData(thisOffer.tokenId)
      // console.log(`tokenData: ${JSON.stringify(tokenData, null, 2)}`)

      // If the token has mutable data, then try to retrieve it from IPFS.
      if (!thisOffer.iconDownloaded && tokenData.mutableData && tokenData.mutableData.includes('ipfs://')) {
        const cid = tokenData.mutableData.substring(7)
        // console.log('cid')

        // Retrieve the mutable data from Filecoin/IPFS.
        const url = `https://${cid}.ipfs.dweb.link/data.json`
        const result = await axios.get(url)

        const mutableData = result.data
        // console.log(`mutableData: ${JSON.stringify(mutableData, null, 2)}`)

        const tokenIcon = mutableData.tokenIcon

        const newIcon = (
          <Card.Img src={tokenIcon} />
        )

        tokenFound = true

        // Add the JSX for the icon to the token object.
        thisOffer.icon = newIcon
        thisOffer.mutableData = mutableData
      }

      // If the token does not have mutable data to store icon data,
      // Check the slp-token-icon GitHub repository for an icon:
      // https://github.com/kosinusbch/slp-token-icons
      if (!tokenFound && !thisOffer.iconDownloaded) {
        const url = `https://tokens.bch.sx/250/${thisOffer.tokenId}.png`
        // console.log('url: ', url)

        // Check to see if icon exists. If it doesn't, axios will throw an error
        // and this function can exit.
        try {
          await axios.get(url)

          const newIcon = (
            <Card.Img src={url} />
          )

          // Add the JSX for the icon to the token object.
          thisOffer.icon = newIcon
        } catch (err) {
          thisOffer.icon = (<Jdenticon size='100' value={thisOffer.tokenId} />)
        }
      }

      // Signal that a token download has been attempted.
      thisOffer.iconDownloaded = true

      // Add the token data from the indexer
      thisOffer.tokenData = tokenData

      // Trigger a render with the new token icon.
      this.setState({ offers })
    }

    // Update the state of the wallet with the balances
    // this.state.appData.updateBchWalletState({ slpTokens: tokens })

    this.setState({
      iconsAreLoaded: true
    })
  }
}

export default NFTs
