import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { initContract } from './utils'

window.nearInitPromise = initContract()
  .then(() => {

      console.log(`Contract: ${window.contract.contractId}. Current user: ${window.accountId || "Unknown"}.`);

      //window.token_contracts = [];

    ReactDOM.render(
      <App />,
      document.querySelector('#root')
    )
  })
  .catch(console.error)
