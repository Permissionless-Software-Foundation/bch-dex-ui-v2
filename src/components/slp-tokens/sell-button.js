/*
  This component renders as a button. When clicked, it opens a modal that
  displays information about the token.

  This is a functional component with as little state as possible.
*/

// Global npm libraries
import React from 'react'
import { Button, Modal, Container, Row, Col, Form, Spinner } from 'react-bootstrap'
import axios from 'axios'

// Local libraries
import config from '../../config'

class SellButton extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      sellQty: '',
      pricePerToken: '',
      token: props.token,
      appData: props.appData,

      // Modal state
      show: false,
      statusMsg: '',
      hideSpinner: true,
      denyClose: false,
      shouldRefreshOnModalClose: false,

      // Function from parent View component. Called after sell tokens,
      // to trigger a refresh of the wallet token balances.
      refreshTokens: props.refreshTokens
    }

    // Bind this variable to event handlers.
    this.handleSell = this.handleSell.bind(this)
    this.handleOpen = this.handleOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  render () {
    // console.log(`props.token: ${JSON.stringify(this.state.token, null, 2)}`)

    return (
      <>
        <Button variant='info' onClick={this.handleOpen}>Sell</Button>

        <Modal show={this.state.show} onHide={this.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Sell Token: <span style={{ color: 'red' }}>{this.state.token.ticker}</span></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container>

              <Row>
                <Col xs={4}><b>Ticker</b>:</Col>
                <Col xs={8}>{this.state.token.ticker}</Col>
              </Row>

              <Row style={{ backgroundColor: '#eee' }}>
                <Col xs={4}><b>Name</b>:</Col>
                <Col xs={8}>{this.state.token.name}</Col>
              </Row>

              <Row>
                <Col xs={4}><b>Token ID</b>:</Col>
                <Col xs={8} style={{ wordBreak: 'break-all' }}>{this.state.token.tokenId}</Col>
              </Row>

              <Row style={{ backgroundColor: '#eee' }}>
                <Col xs={4}><b>Balance</b>:</Col>
                <Col xs={8}>{this.state.token.qty}</Col>
              </Row>
              <br />

              <Row>
                <Col xs={4}><b>Sell Qty</b>:</Col>
                <Col xs={8}>
                  <Form>
                    <Form.Group controlId='sellQty'>
                      <Form.Control
                        type='text'
                        placeholder='1'
                        onChange={e => this.setState({ sellQty: e.target.value })}
                        value={this.state.sellQty}
                      />
                    </Form.Group>
                  </Form>
                </Col>
              </Row>
              <br />

              <Row>
                <Col xs={4}><b>Price per Token (USD)</b>:</Col>
                <Col xs={8}>
                  <Form>
                    <Form.Group controlId='sellQty'>
                      <Form.Control
                        type='text'
                        placeholder='0.01'
                        onChange={e => this.setState({ pricePerToken: e.target.value })}
                        value={this.state.pricePerToken}
                      />
                    </Form.Group>
                  </Form>
                </Col>
              </Row>
              <br />

              <Row>
                <Col style={{ textAlign: 'center' }}>
                  <Button onClick={this.handleSell}>Sell</Button>
                </Col>
              </Row>
              <br />

              <Row>
                <Col style={{ textAlign: 'center' }}>
                  {this.state.statusMsg} {
                    this.state.hideSpinner ? null : <Spinner animation='border' />
                  }
                </Col>
              </Row>
            </Container>
          </Modal.Body>
          <Modal.Footer />
        </Modal>
      </>
    )
  }

  async handleSell (event) {
    console.log('Sell button clicked.')

    let statusMsg = 'Preparing to sell tokens...'
    try {
      this.setState({
        statusMsg,
        hideSpinner: false,
        denyClose: true,
        shouldRefreshOnModalClose: false
      })

      // const wallet = this.state.appData.avaxWallet
      // const bchjs = wallet.bchjs
      const token = this.state.token

      // Validate the quantity input
      let qty = this.state.sellQty
      qty = parseFloat(qty)
      if (isNaN(qty) || qty <= 0) throw new Error('Invalid sell quantity')

      if (qty > token.qty) {
        throw new Error('Sell quantity is greater than your current balance.')
      }

      // Update the wallets UTXOs
      // const infoStr = 'Getting BCH spot price...'
      // console.log(infoStr)
      // this.setState({ statusMsg: infoStr })

      // const avaxPrice = await wallet.getUsd()
      // const request = await axios.get(`${config.server}/mnemonic/price`)
      // const avaxSpotPrice = request.data.usd
      // console.log('avaxSpotPrice: ', avaxSpotPrice)

      const bchSpotPrice = this.state.appData.bchWalletState.bchUsdPrice
      console.log('BCH spot price: ', bchSpotPrice)

      // Validate the price-per-token input.
      let pricePerToken = this.state.pricePerToken
      pricePerToken = parseFloat(pricePerToken)
      if (isNaN(pricePerToken) || pricePerToken <= 0) throw new Error('Invalid price per token')

      // Calculate the other fields.
      const bchjs = this.state.appData.bchWallet.bchjs
      const bchPerToken = bchjs.Util.floor8(pricePerToken / bchSpotPrice)
      console.log('bchPerToken: ', bchPerToken)
      const satsPerToken = bchjs.BitcoinCash.toSatoshi(bchPerToken)
      console.log('satsPerToken: ', satsPerToken)

      // Construct object
      const order = {
        lokadId: 'SWP',
        messageType: 1,
        messageClass: 1,
        tokenId: this.state.token.tokenId,
        buyOrSell: 'sell',
        rateInBaseUnit: satsPerToken,
        minUnitsToExchange: Math.ceil(satsPerToken * qty),
        numTokens: qty
      }

      statusMsg = 'Submitting order to bch-dex API (this can take a few minutes)...'
      console.log(statusMsg)
      this.setState({ statusMsg })

      const options = {
        method: 'post',
        url: `${config.server}/order`,
        data: { order }
      }
      const result = await axios(options)
      // console.log('result.data: ', result.data)

      const p2wdbHash = result.data.hash

      this.setState({
        statusMsg: (<p><b>Success!</b> Offer Created and updated to <a href={`https://p2wdb.fullstack.cash/entry/hash/${p2wdbHash}`} target='_blank' rel='noreferrer'>P2WDB</a>!</p>),
        hideSpinner: true,
        sendQtyStr: '',
        pricePerTokenStr: '',
        shouldRefreshOnModalClose: true,
        denyClose: false
      })
    } catch (err) {
      console.error('Error in handleSendTokens(): ', err)

      this.setState({
        statusMsg: `Error selling tokens: ${err.message}`,
        hideSpinner: true,
        denyClose: false
      })
    }
  }

  // Handle closing the modal.
  async handleClose () {
    if (!this.state.denyClose) {
      this.setState({
        show: false
      })

      if (this.state.shouldRefreshOnModalClose) {
        await this.state.refreshTokens()

        this.setState({ shouldRefreshOnModalClose: false })
      }
    }
  }

  // Handle opening the modal.
  handleOpen () {
    this.setState({
      show: true
    })
  }
}

export default SellButton
