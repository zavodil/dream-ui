import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import * as nearAPI from "near-api-js";
import getConfig from './config'
import Big from "big.js";

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

// Initialize contract & set global variables
export async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  window.walletConnection = new WalletConnection(near)

  // Getting the Account ID. If still unauthorized, it's just empty string
  window.accountId = window.walletConnection.getAccountId();

  // Initializing our contract APIs by contract name and configuration
  window.contract = await new Contract(window.walletConnection.account(), nearConfig.contractName, {
    // View methods are read only. They don't modify the state, but usually return some value.
    viewMethods: ['get_balance', 'get_tokens', 'get_whitelisted_tokens', 'get_token_name'],
    // Change methods can modify the state. But you don't receive the returned value when called.
    changeMethods: ['deposit', 'create_token'],
  });


  const randomPublicKey = nearAPI.utils.PublicKey.from(
      "ed25519:8fWHD35Rjd78yeowShh9GwhRudRtLLsGCRjZtgPjAtw9"
  );
  let nearConnection = near;
  const _near = {};
  _near.keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
  _near.walletConnection = window.walletConnection;
  _near.accountId = _near.walletConnection.getAccountId();
  _near.account = _near.walletConnection.account();
  _near.contract = window.contract;

  _near.fetchBlockHash = async () => {
    const block = await nearConnection.connection.provider.block({
      finality: "final",
    });
    return nearAPI.utils.serialize.base_decode(block.header.hash);
  };

  _near.fetchBlockHeight = async () => {
    const block = await nearConnection.connection.provider.block({
      finality: "final",
    });
    return block.header.height;
  };

  _near.fetchNextNonce = async () => {
    const accessKeys = await _near.account.getAccessKeys();
    return accessKeys.reduce(
        (nonce, accessKey) => Math.max(nonce, accessKey.access_key.nonce + 1),
        1
    );
  };

  _near.sendTransactions = async (items) => {
    let [nonce, blockHash] = await Promise.all([
      _near.fetchNextNonce(),
      _near.fetchBlockHash(),
    ]);

    const transactions = [];
    let actions = [];
    let currentReceiverId = null;
    items.push([null, null]);
    items.forEach(([receiverId, action]) => {
      if (receiverId !== currentReceiverId) {
        if (currentReceiverId !== null) {
          transactions.push(
              nearAPI.transactions.createTransaction(
                  window.accountId,
                  randomPublicKey,
                  currentReceiverId,
                  nonce++,
                  actions,
                  blockHash
              )
          );
          actions = [];
        }
        currentReceiverId = receiverId;
      }
      actions.push(action);
    });
    return await _near.walletConnection.requestSignTransactions(transactions);
  };

  window._near = _near;
}

export function logout() {
  window.walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  window.walletConnection.requestSignIn(nearConfig.contractName)
}




export function toParams(query) {
  const q = query.replace(/^\??\//, '');

  return q.split('&').reduce((values, param) => {
    const [key, value] = param.split('=');

    values[key] = value;

    return values;
  }, {});
}

export function toQuery(params, delimiter = '&') {
  const keys = Object.keys(params);

  return keys.reduce((str, key, index) => {
    let query = `${str}${key}=${params[key]}`;

    if (index < (keys.length - 1)) {
      query += delimiter;
    }

    return query;
  }, '');
}

export function ConvertToE18(amount) {
  return new Big(Math.round(amount * 100000000)).mul(new Big("10000000000")).toString();
}

export function FormatNearTimestamp(timestamp){
  return new Date(timestamp / 1000000).toISOString().replace(/T/, ' ').replace(/\..+/, '')
}
