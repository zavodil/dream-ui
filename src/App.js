import 'regenerator-runtime/runtime'
import React from 'react'
import {login, logout} from './utils'
import * as nearAPI from 'near-api-js'
import 'react-dropdown/style.css';
import './global.css'
import './app.css'
import {useDetectOutsideClick} from "./includes/useDetectOutsideClick";
import {Header, Footer, Notification, NearLogo} from "./includes/pageParts";
import * as nearFunctions from "/includes/nearFunctions";
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import getConfig from './config'
import getAppSettings from './app-settings'

const appSettings = getAppSettings();
const config = getConfig(process.env.NODE_ENV || 'development');
const FRAC_DIGITS = 5;

const defaultUnlockHint = "Tokens will be locked until selected unlock event";

export default function App() {
    const [buttonDisabled, setButtonDisabled] = React.useState(false)
    const [showNotification, setShowNotification] = React.useState(false)
    const navDropdownRef = React.useRef(null);
    const lockTypeRef = React.useRef(null);
    const tokenInputRef = React.useRef(null);
    const [isNavDropdownActive, setIsNaVDropdownActive] = useDetectOutsideClick(navDropdownRef, false);

    /* APP STATE */
    const [input, setInput] = React.useState("");
    const [deposit, setDeposit] = React.useState(0);
    const [accountId, setAccountId] = React.useState("");
    const [tokenInput, setTokenInput] = React.useState("0.0");
    const [tokenInputAccountBalance, setTokenInputAccountBalance] = React.useState(0);
    const [assetInput, setAssetInput] = React.useState("NEAR");
    const [assetInputPrice, setAssetInputPrice] = React.useState(0);
    const [assetInputPriceFormatted, setAssetInputPriceFormatted] = React.useState("");
    const [outputDifferenceInDays, setOutputDifferenceInDays] = React.useState("");
    const [assetInputPopup, setAssetInputPopup] = React.useState(false);
    const [currentMode, setCurrentMode] = React.useState("Lock");

    const [lockTypeOutput, setLockTypeOutput] = React.useState("");
    const [targetPriceOutput, setTargetPriceOutput] = React.useState("0.0");
    const [targetDateOutput, setTargetDateOutput] = React.useState("");
    const [lockTypeOutputPopup, setLockTypeOutputPopup] = React.useState(false);
    const [lockTypeDescription, setLockTypeDescription] = React.useState(defaultUnlockHint);
    const [lockTypeError, setLockTypeError] = React.useState("");

    const [loggedIn, setLoggedIn] = React.useState(false);


    const [allTokens, setAllTokens] = React.useState({});


    /* APP */
    const inputChange = (value) => {
        setInput(value);
        setButtonDisabled(!parseFloat(value) || parseFloat(value) < 0);
    };

    const ParseTokenInput = (value) => {
        let float = parseFloat(value);
        if (!isNaN(float))
            setTokenInput(float);
        else {
            setTimeout(() => {
                tokenInputRef.current.focus();
                tokenInputRef.current.select();
            }, 100);
            setTokenInput(0);
        }
    };

    const ParseTargetPriceOutput = (value) => {
        let float = parseFloat(value);
        if (!isNaN(float))
            setTargetPriceOutput(float);
        else {
            setTargetPriceOutput(0);
            setTimeout(() => {
                lockTypeRef.current.focus();
                lockTypeRef.current.select();
            }, 100);
        }

        ValidateTargetPriceOutput(float);
    };

    const ValidateTargetPriceOutput = (targetPriceOutput) => {
        console.log("ValidateTargetPriceOutput")
        console.log(targetPriceOutput)
        console.log(assetInputPrice)
        setLockTypeError(targetPriceOutput < assetInputPrice ? "Target Price is lower then current price" : "");
    }

    const ValidateAssetInputPrice = (assetInputPrice) => {
        console.log("ValidateAssetInputPrice")
        console.log(targetPriceOutput)
        console.log(assetInputPrice)
        setLockTypeError(targetPriceOutput < assetInputPrice ? "Target Price is lower then current price" : "");
    }


    const ParseAssetInput = (value) => {
        setAssetInput(value);
        setAssetInputPrice(0);
        setAssetInputPriceFormatted(""); // TODO Add Pending
        GetBalance(value);
        UpdatePrice(value).then(newPrice => {
            ValidateAssetInputPrice(newPrice)
        });
        setAssetInputPopup(false);
    }

    const WhitelistedTokens = () => {
        return {
            "NEAR":
                {
                    "img": "https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png",
                    "coingecko_name": "near",
                    "decimals": 24,
                    "address": "near"
                },
            "ETH":
                {
                    "img": "data:image/png;base64,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",
                    "coingecko_name": "ethereum",
                    "decimals": 18,
                    "address": "c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
                },
            "DAI":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
                    "coingecko_name": "dai",
                    "decimals": 18,
                    "address": "6b175474e89094c44da98b954eedeac495271d0f"
                },
            "USDC":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
                    "coingecko_name": "usdc",
                    "decimals": 6,
                    "address": "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
                },
            "USDT":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
                    "coingecko_name": "tether",
                    "decimals": 6,
                    "address": "dac17f958d2ee523a2206206994597c13d831ec7"
                },
            "WBTC":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
                    "coingecko_name": "bitcoin",
                    "decimals": 8,
                    "address": "2260fac5e5542a773aa44fbcfedf7c193bc2c599"
                }
        }
    };

    const GetTokenImage = (token) => {
        return allTokens.hasOwnProperty(token) ? allTokens[assetInput].img : "";
    };

    const UnlockTypesList = () => {
        const unlockTypes = {
            "Target Price": {
                "description": "Token will be unlocked if market price will stay higher then target price for 24 hours",
                "img": <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 1 511 511.999">
                    <path
                        d="m464.359375 0c-.554687 0-1.105469.0234375-1.660156.0703125-3.269531.2695315-76.378907 6.9804685-103.851563 60.2929685l-99.210937-10.082031c-24.042969-2.441406-47.605469 5.960938-64.640625 23.023438l-171.167969 170.601562c-31.113281 31.167969-31.101563 81.863281.023437 113.015625l131.285157 131.394531c15.769531 15.78125 36.457031 23.683594 57.074219 23.683594 20.332031-.003906 40.597656-7.6875 56.007812-23.082031 7.808594-7.804688 7.816406-20.460938.011719-28.269531-7.800781-7.8125-20.460938-7.816407-28.269531-.015626-15.441407 15.429688-40.808594 15.167969-56.539063-.578124l-131.289063-131.394532c-15.5625-15.574218-15.566406-40.921875-.046874-56.46875l171.171874-170.605468c8.535157-8.546876 20.320313-12.75 32.335938-11.53125l152.109375 15.460937 1.980469 19.4375c-27.707032 10.328125-54.074219 11.976563-54.675782 12.011719-11.011718.59375-19.464843 9.996094-18.886718 21.011718.5625 10.667969 9.386718 18.941407 19.945312 18.941407.355469 0 .710938-.007813 1.066406-.027344 1.28125-.066406 26.863282-1.53125 56.710938-11.082031l9.304688 91.378906c1.222656 11.992188-2.957032 23.757812-11.472657 32.292969l-97.523437 96.09375c-7.863282 7.746093-7.957032 20.40625-.210938 28.269531 7.75 7.863281 20.40625 7.957031 28.269532.207031l97.582031-96.148437c.03125-.03125.0625-.0625.097656-.097656 17.085937-17.070313 25.484375-40.640626 23.035156-64.667969l-10.613281-104.1875c13.445312-7.871094 24.78125-17.144531 33.84375-27.714844 17.304688-20.199219 26.074219-44.621094 26.054688-72.582031v-.796875c0-26.386719-21.464844-47.855469-47.851563-47.855469zm7.871094 48.664062c.015625 22.34375-8.074219 40.472657-24.550781 54.808594l-1.855469-18.222656c-.960938-9.4375-8.425781-16.902344-17.867188-17.863281l-23.1875-2.355469c20.460938-19.53125 54.269531-24.308594 60.308594-25.019531 4.003906.367187 7.152344 3.746093 7.152344 7.84375zm-162.011719 244.21875c-7.804688 7.808594-20.460938 7.808594-28.269531 0-7.808594-7.808593-7.808594-20.464843 0-28.269531 2.132812-2.132812 2.519531-4.605469 2.46875-6.304687-.078125-2.730469-1.269531-5.382813-3.351563-7.460938l-12.246094-12.25c-3.175781-3.175781-7.261718-4.949218-11.503906-4.996094-2.976562-.027343-7.222656.742188-11.085937 4.609376l-3.15625 3.15625c-6.515625 6.511718-6.753907 17.273437-.527344 23.503906l12.953125 12.949218c10.613281 10.613282 16.539062 24.617188 16.695312 39.4375.152344 15.027344-5.640624 29.1875-16.324218 39.867188l-1.472656 1.472656c-10.804688 10.808594-24.722657 16.195313-38.730469 16.195313-11.898438.003906-23.855469-3.898438-34.039063-11.652344l-8.371094 8.078125c-3.878906 3.742188-8.882812 5.601562-13.878906 5.601562-5.234375 0-10.464844-2.042968-14.386718-6.109374-7.667969-7.945313-7.4375-20.601563.507812-28.265626l7.492188-7.230468c-8.429688-9.132813-13.191407-20.757813-13.453126-32.972656-.28125-13.3125 4.792969-25.878907 14.292969-35.378907 7.808594-7.804687 20.464844-7.804687 28.273438 0 7.804687 7.808594 7.804687 20.464844 0 28.273438-1.773438 1.769531-2.644531 3.875-2.59375 6.253906.054687 2.554687 1.195312 5.074219 3.21875 7.09375l21.054687 21.054687c6.59375 6.59375 16.199219 6.929688 22.34375.789063l1.472656-1.476563c3.019532-3.015624 4.65625-6.984374 4.613282-11.179687-.046875-4.296875-1.816406-8.410156-4.984375-11.578125l-12.957031-12.953125c-21.921876-21.925781-21.683594-57.832031.527343-80.046875l3.160157-3.15625c10.535156-10.535156 24.425781-16.316406 39.171874-16.316406h.617188c10.195312.113281 20.011719 2.980468 28.609375 8.242187l8.585937-8.867187c7.683594-7.933594 20.335938-8.136719 28.269532-.457032 7.929687 7.679688 8.132812 20.335938.453125 28.269532l-8.476563 8.753906c5.683594 8.105469 8.898438 17.632812 9.191406 27.574219.394532 13.523437-4.632812 26.21875-14.164062 35.746093zm0 0"/>
                </svg>
            },
            "Target Date": {
                "description": "Token will be unlocked at specified date",
                "img": <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <g>
                        <path
                            d="m10.193 19.591c.173.235.439.383.73.406.026.002.052.003.077.003.264 0 .519-.104.707-.293l5.75-5.75c.391-.391.391-1.023 0-1.414s-1.023-.391-1.414 0l-4.926 4.926-2.061-2.81c-.327-.445-.953-.542-1.398-.215s-.542.953-.215 1.398z"/>
                        <path
                            d="m21 3h-1v-2c0-.552-.448-1-1-1h-1c-.552 0-1 .448-1 1v2h-10v-2c0-.552-.448-1-1-1h-1c-.552 0-1 .448-1 1v2h-1c-1.654 0-3 1.346-3 3v15c0 1.654 1.346 3 3 3h18c1.654 0 3-1.346 3-3v-15c0-1.654-1.346-3-3-3zm1 18c0 .551-.449 1-1 1h-18c-.551 0-1-.449-1-1v-10.96h20z"/>
                    </g>
                </svg>
            }
        };
        let block = Object.keys(unlockTypes).map(unlockType => createUnlockTypeObject(unlockType, unlockTypes[unlockType]));
        return <div className="popup-options">
            {block}
            <div className="common-basis-block">
                <div className="common-basis unlock-option-hint">
                    {lockTypeDescription}
                </div>
            </div>
        </div>;
    }

    const IsTargetPriceSelected = (unlockType) => {
        return (unlockType === "Target Price")
    };

    const IsTargetDateSelected = (unlockType) => {
        console.log(unlockType)
        return (unlockType === "Target Date")
    };

    const createUnlockTypeObject = (unlockType, details) => {
        const isActive = unlockType === assetInput;
        return <div className={`unlock-type-option ${isActive ? "popup-options-item" : "popup-options-item-inactive"}`}
                    onClick={() => {
                        setLockTypeError();
                        setLockTypeOutput(unlockType);
                        setLockTypeOutputPopup(false);

                        if (IsTargetPriceSelected(unlockType)) {
                            UpdatePrice().then((newPrice) => {
                                if (!parseFloat(targetPriceOutput)) {
                                    setTargetPriceOutput(newPrice);
                                    ValidateAssetInputPrice(targetPriceOutput)
                                }

                                setTimeout(() => {
                                    lockTypeRef.current.focus();
                                    lockTypeRef.current.select();
                                }, 100);
                            });
                        }

                        if (IsTargetDateSelected(unlockType)) {
                            updateTargetDateOutput();

                        }


                    }}
                    onMouseOver={() => setLockTypeDescription(details.description)}
                    onMouseLeave={() => setLockTypeDescription(defaultUnlockHint)}
                    key={unlockType}
        >
            <div className="popup-option-image lock-type-image">
                {details.img}
            </div>
            <div className="popup-option-text">{unlockType}</div>
        </div>;
    };

    const updateTargetDateOutput = (day) => {
        if (day) {
            const differenceInTime = day.getTime() - new Date();
            const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));

            setLockTypeError((differenceInDays < 0) ? "Illegal unlock date" : "");
            setOutputDifferenceInDays(differenceInDays);
        }
        setTargetDateOutput(day);
    };

    const TokensList = () => {
        let block = Object.keys(allTokens).map(token => createTokenObject(token, allTokens[token]));
        return <div className="popup-options">
            {block}
        </div>;
    };

    const createTokenObject = (token, details) => {
        const isActive = token === assetInput;
        return <div className={isActive ? "popup-options-item" : "popup-options-item-inactive"}
                    onClick={() => ParseAssetInput(token)} key={token}>
            <img className="popup-option-image"
                 alt={token + " logo"}
                 src={details.img}
            />
            <div className="popup-option-text">{token}</div>
        </div>;
    };

    const IsLockTypeSet = () => ["Target Price", "Target Date"].includes(lockTypeOutput);


    /* ON LOAD EVENT */
    const OnSignIn = async (allTokens) => {
        try {

            await setTokenContracts(allTokens).then(() => {
                console.log(window.token_contracts);
            })

        } catch (e) {
            Notify({method: "fail", data: e.message});
        }
    };

    /* UI EVENTS */
    const NavMenuOnClick = () => setIsNaVDropdownActive(!isNavDropdownActive);

    const Notify = (params) => {
        setShowNotification(params);
        setTimeout(() => {
            setShowNotification(false)
        }, 11000)
    };


    function getNearAccountConnection() {
        if (!window.connection) {
            const provider = new nearAPI.providers.JsonRpcProvider(config.nodeUrl);
            window.connection = new nearAPI.Connection(config.nodeUrl, provider, {});
        }
        return window.connection;
    }

    const GetAccountState = async (connection, accountId) => {
        try {
            return await new nearAPI.Account(connection, accountId).state();
        } catch (error) {
            return null;
        }
    };

    const GetPriceUrl = (token) => `https://api.coingecko.com/api/v3/simple/price?ids=${token.toLowerCase()}&vs_currencies=usd`;

    const methods = {
        viewMethods: ['ft_balance_of', 'storage_balance_of'],
        changeMethods: [],
    };

    const AddContractWithPromise = async (key, allTokens) => { //a function that returns a promise
        window.token_contracts[key] = await new nearAPI.Contract(
            window.walletConnection.account(),
            getContractAddress(allTokens[key].address), methods);
        return Promise.resolve('ok')
    };

    const getContractAddress = (token_address) => {
        return token_address + ".factory.bridge.near";
    }

    const AddContract = async (key, allTokens) => {
        return AddContractWithPromise(key, allTokens)
    }

    const setTokenContracts = async (allTokens) => {
        return Promise.all(Object.keys(allTokens).map(key => AddContract(key, allTokens)))
    };

    React.useEffect(
        async () => {
            const allTokens = WhitelistedTokens();
            setAllTokens(allTokens);

            if (window.walletConnection.isSignedIn()) {
                await OnSignIn(allTokens).then(() => {
                    setLoggedIn(true);
                    setAccountId(window.accountId || "Connect wallet");
                })

            } else {
                setLoggedIn(false);
                setAccountId("Connect wallet");
            }

            if (window.accountId)
                GetNearBalance();

            UpdatePrice();
        },
        []
    );

    const GetBalance = (token) => {
        if (token === "NEAR")
            GetNearBalance().then(balance => {
                if (balance < parseFloat(tokenInput))
                    setTokenInput(0);
            });
        else
            GetFtBalance(token).then(balance => {
                if (balance < parseFloat(tokenInput))
                    setTokenInput(0);
            });
    };

    const GetNearBalance = () => {
        const connection = getNearAccountConnection();
        return GetAccountState(connection, window.accountId).then(state => {
            if (state) {
                const balance = nearAPI.utils.format.formatNearAmount(state.amount, 2);
                setTokenInputAccountBalance(balance);
                return balance;
            }
            return 0;
        })
    }

    const GetFtBalance = (token) => {
        return new Promise((resolve, reject) => {
            window.token_contracts[token].ft_balance_of({
                account_id: window.accountId
            })
                .then(amount => {
                    let balance = amount / Math.pow(10, allTokens[token].decimals);

                    setTokenInputAccountBalance(
                        balance > 0
                            ? balance.toFixed(8)
                            : 0
                    );

                    return resolve(balance);
                })
                .catch(err => {
                    console.log(err);
                    return reject(0);
                })
        });
    }

    const UpdatePrice = async (token) => {
        if (token === undefined)
            token = assetInput;
        console.log("request price for " + token);


        if (token && allTokens.hasOwnProperty(token)) {
            let ticker = allTokens[token].coingecko_name;

            return await fetchWithTimeout(GetPriceUrl(ticker), {
                timeout: 9000
            }).then(response => response.json())
                .then(rows => {


                    try {

                        if (rows.hasOwnProperty(ticker)) {
                            let price = parseFloat(rows[ticker].usd);
                            setAssetInputPrice(price);
                            if (price > 0)
                                setAssetInputPriceFormatted(formatter.format(price));
                            else
                                setAssetInputPriceFormatted("");

                            console.log(price);
                            return (price);
                        }
                    } catch (error) {
                        console.log(error.name === 'AbortError');
                        setAssetInputPrice(0);
                        setAssetInputPriceFormatted("");
                        return (0);
                    }
                });
        }
    }

    async function fetchWithTimeout(resource, options = {}) {
        const {timeout = 8000} = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);

        return response;
    }

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });


    React.useEffect(() => {
        const timer = setInterval(() => {
            if (IsTargetPriceSelected(lockTypeOutput))
                UpdatePrice().then(newPrice => ValidateAssetInputPrice(newPrice))
        }, 10000);
        return () => clearInterval(timer);
    });

    /* LOGIN SCREEN */
    /*
    if (!window.walletConnection.isSignedIn()) {
        return (
            <>
                <Header onClick={login}
                        config={config}
                        title={accountId}
                        deposit={deposit}
                        isNavDropdownActive={isNavDropdownActive}
                        appSettings={appSettings}/>
                <main>
                    <h1>{appSettings.appFullNme}</h1>
                    <p>
                        {appSettings.appDescription}
                    </p>
                    <p>
                        To make use of the NEAR blockchain, you need to sign in. The button
                        below will sign you in using NEAR Wallet.
                    </p>
                    <p style={{textAlign: 'center', marginTop: '2.5em'}}>
                        <button onClick={login}>Sign in</button>
                    </p>
                </main>
                <Footer appSettings={appSettings}/>
            </>
        )
    }
    */

    const isLockTypeSet = IsLockTypeSet();


    return (
        <>
            { /* <Header onClick={NavMenuOnClick}
                    title={accountId}
                    config={config}
                    deposit={deposit}
                    navDropdownRef={navDropdownRef}
                    isNavDropdownActive={isNavDropdownActive}
                    appSettings={appSettings}/> */}


            {assetInputPopup && <div data-focus-lock-disabled="false">
                <div>
                    <div className="popup" data-reach-dialog-overlay="" /*style={"opacity: 1;"}*/>
                        <div aria-modal="true" role="dialog" tabIndex="-1" aria-label="dialog"
                             className="popup-box" data-reach-dialog-content="">
                            <div className="popup-box-1">
                                <div className="popup-box-2">
                                    <div className="popup-title">
                                        <div className="popup-title-text">Select a token</div>
                                        <div onClick={() => setAssetInputPopup(false)} className="close-popup">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round"
                                                 className="sc-1cchcrx-1 bNKSgQ">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="popup-search-input">
                                        <input type="text"
                                               id="token-search-input"
                                               placeholder="Search name or paste address"
                                               autoComplete="off"
                                               className="popup-search-input-control"
                                               onChange={e => ParseAssetInput(e.target.value)}
                                               value={assetInput}
                                        />
                                    </div>
                                    <div className="common-basis-div">
                                        <div className="common-basis-block">
                                            <div className="common-basis">Common bases</div>
                                        </div>
                                        <TokensList/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            }

            {lockTypeOutputPopup && <div data-focus-lock-disabled="false">
                <div>
                    <div className="popup" data-reach-dialog-overlay="">
                        <div aria-modal="true" role="dialog" tabIndex="-1" aria-label="dialog"
                             className="popup-box" data-reach-dialog-content="">
                            <div className="popup-box-1">
                                <div className="popup-box-2">
                                    <div className="popup-title">
                                        <div className="popup-title-text">Select unlock type</div>
                                        <div onClick={() => setLockTypeOutputPopup(false)} className="close-popup">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round"
                                                 className="sc-1cchcrx-1 bNKSgQ">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="common-basis-div">
                                        <UnlockTypesList/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>}

            <div className="top-grid">
                <NearLogo/>

                <div className="top-menu"><a aria-current="page"
                                             className={`top-menu-item ${currentMode === "Lock" ? "active" : ""}`}
                                             onClick={() => setCurrentMode("Lock")}
                                             href="#/lock">Lock</a>
                    <a
                        className={`top-menu-item ${currentMode === "Unlock" ? "active" : ""}`}
                        onClick={() => setCurrentMode("Unlock")}
                        href="#/unlock">Unlock</a>
                </div>


                <div className="top-menu-right">
                    {loggedIn ?
                        <button onClick={NavMenuOnClick} className="menu-trigger top-menu-right-button">
                            <span className="title">{accountId}</span>
                        </button>
                        :
                        <button onClick={NavMenuOnClick} className="menu-trigger top-menu-right-button">
                            <span className="title">Connect Wallet</span>
                        </button>
                    }
                    <nav
                        ref={navDropdownRef}
                        className={`menu ${isNavDropdownActive ? "active" : "inactive"}`}
                    >
                        <ul>
                            <li>
                                <a href={"#"}>Account</a>
                            </li>
                            <li>
                                <a href={"#"}>Settings</a>
                            </li>
                            <li>
                                <a href={"#"} onClick={logout}>Sign Out</a>

                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            <main>
                <div className="background-img"/>

                <div className="main">
                    <div className="sub-title">Lock tokens</div>

                    <div className="swap-page">
                        <div className="grid">
                            <div>
                                <div className="input">
                                    <div className="input-box">
                                        <div className="asset">
                                            <button className="asset-1" onClick={() => setAssetInputPopup(true)}>
                                                <span className="ticker">
                                                    <div className="token">
<img src={GetTokenImage(assetInput)}
     className="token-logo"/>

    <span className="token-name">{assetInput}</span>

                                                    </div>
                                                    <svg width="12" height="7" viewBox="0 0 12 7" fill="none"
                                                         xmlns="http://www.w3.org/2000/svg"
                                                         className="image-arrow-down"><path
                                                        d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path></svg>
                                                </span>
                                            </button>

                                            <input className="token-amount-input"
                                                   inputMode="decimal" autoComplete="off" autoCorrect="off"
                                                   type="number" step="0.1"
                                                   placeholder="0.0" minLength="1"
                                                   maxLength="79" spellCheck="false"
                                                   ref={tokenInputRef}
                                                   onChange={e => ParseTokenInput(e.target.value)}
                                                   value={tokenInput}
                                            />
                                        </div>

                                        {loggedIn && <div className="input-balance">
                                            <div className="input-balance-row">
                                                <div className="input-balance-value">
                                                    <div
                                                        className="input-balance-text">Balance: {tokenInputAccountBalance} {assetInput}
                                                    </div>
                                                    <button className="input-balance-max"
                                                            onClick={() => {
                                                                setTokenInput(tokenInputAccountBalance.toString().replace(",", ""))
                                                            }}>(Max)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        }

                                    </div>


                                </div>

                                <div className="arrow">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                         viewBox="0 0 24 24"
                                         fill="none" stroke="#8F96AC" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <polyline points="19 12 12 19 5 12"></polyline>
                                    </svg>
                                </div>

                                <div className="input">
                                    <div className="input-box">
                                        <div className={`asset ${!isLockTypeSet ? "lock-type-default": ""}`}>

                                            <button className={`${isLockTypeSet ? "" : "select-lock-type"} asset-2`}
                                                    onClick={() => setLockTypeOutputPopup(true)}>
                                                <span className="ticker">
                                                    <div className="token lock-type">
                                                         <span className="token-name">
                                                             {
                                                                 isLockTypeSet
                                                                     ? lockTypeOutput : "Select Lock Type"
                                                             }:</span>

                                                    </div>
                                                    <svg width="12" height="7" viewBox="0 0 12 7" fill="none"
                                                         xmlns="http://www.w3.org/2000/svg"
                                                         className="image-arrow-down"><path
                                                        d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path></svg>
                                                </span>
                                            </button>

                                            {IsTargetPriceSelected(lockTypeOutput) &&
                                            <div className="lock-type-target-price">
                                                <input className="token-amount-input"
                                                       inputMode="decimal" autoComplete="off" autoCorrect="off"
                                                       type="number" step="0.1"
                                                       placeholder="0.0" minLength="1"
                                                       maxLength="79" spellCheck="false"
                                                       onChange={e => ParseTargetPriceOutput(e.target.value)}
                                                       ref={lockTypeRef}
                                                       value={targetPriceOutput}
                                                       disabled={!isLockTypeSet}
                                                />
                                            </div>}

                                            {IsTargetDateSelected(lockTypeOutput) &&

                                            <div className="lock-type-target-date">
                                                <DayPickerInput
                                                    value={targetDateOutput}
                                                    month={new Date(new Date().getFullYear() + 1, new Date().getMonth())}
                                                    showOutsideDays
                                                    onDayChange={day => updateTargetDateOutput(day)}/>
                                            </div>}


                                        </div>

                                        {isLockTypeSet && <div className="input-balance">
                                            <div className="input-balance-row">
                                                <div className="input-balance-value">
                                                    {IsTargetDateSelected(lockTypeOutput) &&
                                                    <div className="input-days-difference">
                                                        Days left: {outputDifferenceInDays}
                                                    </div>
                                                    }
                                                    {IsTargetPriceSelected(lockTypeOutput) &&
                                                    <div className="input-balance-text">
                                                        Current Price: {assetInputPriceFormatted}
                                                    </div>}

                                                    <div className="input-balance-price-error input-error">
                                                        {lockTypeError}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>}


                                    </div>
                                </div>

                            </div>

                        </div>

                        <div className="separator"/>

                        <div>
                            {loggedIn ?
                                <button className="main-button"
                                        disabled={!!lockTypeError || parseFloat(tokenInput) === 0 || lockTypeOutput === ""}>
                                    <div>Lock</div>
                                </button> :

                                <button className="main-button inactive" onClick={login}>
                                    <div>Connect Wallet</div>
                                </button>
                            }
                        </div>

                    </div>
                </div>

            </main>
            <Footer appSettings={appSettings}/>
            {showNotification && Object.keys(showNotification) &&
            <Notification config={config} method={showNotification.method} data={showNotification.data}/>}
        </>
    );
}