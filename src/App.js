import 'regenerator-runtime/runtime'
import React from 'react'
import {ConvertToE18, login, logout} from './utils'
import * as nearAPI from 'near-api-js'
import 'react-dropdown/style.css';
import './global.css'
import './app.css'
import {useDetectOutsideClick} from "./includes/useDetectOutsideClick";
import {Footer, NearLogo, Notification} from "./includes/pageParts";
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import getConfig from './config'
import getCoingeckoMap from './coingecko'
import getAppSettings from './app-settings'
import Big from "big.js";

const TGas = Big(10).pow(12);
const StorageCostPerByte = Big(10).pow(19);
const TokenStorageDeposit = StorageCostPerByte.mul(250000);
const TokenRegisterDeposit = StorageCostPerByte.mul(125);

const appSettings = getAppSettings();
const config = getConfig(process.env.NODE_ENV || 'development');
const FRAC_DIGITS = 5;
const UNDEFINED_IMAGE = "https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png";
const PRICE_ORACLE = "priceoracle.testnet";
const DEFAULT_TOKEN_NAME = "Wrapped Near";
const DEFAULT_TOKEN_ACCOUNT_ID = "wrap.testnet";

const defaultUnlockHint = "Tokens will be locked until selected unlock event";

export default function App() {
    const [buttonDisabled, setButtonDisabled] = React.useState(false)
    const [showNotification, setShowNotification] = React.useState(false)
    const navDropdownRef = React.useRef(null);
    const lockTypeRef = React.useRef(null);
    const tokenInputRef = React.useRef(null);
    const tokenUnlockRef = React.useRef(null);
    const [isNavDropdownActive, setIsNaVDropdownActive] = useDetectOutsideClick(navDropdownRef, false);


    /* APP STATE */
    const [loading, setLoading] = React.useState(true);
    const [input, setInput] = React.useState("");
    const [deposit, setDeposit] = React.useState(0);
    const [accountId, setAccountId] = React.useState("");
    const [tokenInput, setTokenInput] = React.useState("0.0");
    const [tokenInputAccountBalance, setTokenInputAccountBalance] = React.useState(0);
    const [assetInput, setAssetInput] = React.useState(DEFAULT_TOKEN_ACCOUNT_ID);
    const [assetInputName, setAssetInputName] = React.useState(DEFAULT_TOKEN_NAME);
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


    const [allWhitelistedTokens, setAllWhitelistedTokens] = React.useState({});
    const [allWenTokens, setAllWenTokens] = React.useState({});

    const [userBalances, setUserBalances] = React.useState({});
    const [selectedUserToken, setSelectedUserToken] = React.useState("");
    const [hasUserBalances, setHasUserBalances] = React.useState(false);
    const [selectedUserTokenBalance, setSelectedUserTokenBalance] = React.useState("0.0");
    const [tokenLockAmountInput, setTokenLockAmountInput] = React.useState("0.0");
    const [unlockTypeError, setUnlockTypeError] = React.useState("");
    const [assetLockedPopup, setAssetLockedPopup] = React.useState(false);
    const [parseLockedAssetInputTextbox, setParseLockedAssetInputTextbox] = React.useState("");

    const [tokenAlreadyCreated, setTokenAlreadyCreated] = React.useState(false);
    const [tokenAlreadyCreatedName, setTokenAlreadyCreatedName] = React.useState("");

    /* APP */
    const inputChange = (value) => {
        setInput(value);
        setButtonDisabled(!parseFloat(value) || parseFloat(value) < 0);
    };

    const ParseLockAmountInput = (value) => {
        let float = parseFloat(value);
        if (!isNaN(float)) {
            if (float < 0 || float > selectedUserTokenBalance) {
                setUnlockTypeError("Not enough balance");
            } else {
                setUnlockTypeError("");
            }
            setTokenLockAmountInput(float);
        } else {
            setTimeout(() => {
                tokenUnlockRef.current.focus();
                tokenUnlockRef.current.select();
            }, 100);
            setTokenLockAmountInput(0);
        }
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
        setLockTypeError(targetPriceOutput < assetInputPrice ? "Target Price is lower then current price" : "");
    }

    const ValidateAssetInputPrice = (assetInputPrice) => {
        setLockTypeError(targetPriceOutput < assetInputPrice ? "Target Price is lower then current price" : "");
    }

    const UpdateAssetInputName = async (assetName) => {
        const allTokenIds = Object.keys(allWhitelistedTokens);
        let tokens = allTokenIds.filter(token => {
                return allWhitelistedTokens[token].name.toLowerCase() === assetName.toLowerCase()
            }
        );
        if (tokens.length === 1) {
            setAssetInput(tokens[0])
            setAssetInputName(assetName);
            await CheckWenTokenAvailability()
        } else {
            throw ("Unknown Asset Name " + assetName)
        }
    }

    const CheckWenTokenAvailability = async (targetPrice) => {
        if (targetPrice === undefined)
            targetPrice = targetPriceOutput;
        const wenTokens = Object.keys(allWenTokens);
        if (wenTokens.length) {
            let sameTokens = wenTokens.filter(token_index => {
                const token = allWenTokens[token_index];
                return (
                    parseFloat(token.minimum_unlock_price.multiplier) == convertTargetPriceOutput(targetPrice) &&
                    token.asset_id == assetInput
                );
            })
            setTokenAlreadyCreated(Object.keys(sameTokens).length > 0);
            if (Object.keys(sameTokens).length) {
                setTokenAlreadyCreatedName(await GetTokenName());
            }
        }
    }

    const ParseLockedAssetInput = (value) => {
        setParseLockedAssetInputTextbox(value);
        const allTokenIds = Object.keys(userBalances);
        if (allTokenIds.length) {
            let tokens = allTokenIds.filter(token => {
                console.log(token)
                console.log(userBalances[token].meta.name)
                    return userBalances[token].meta.name.toLowerCase() === value.toLowerCase()
                }
            );

            console.log(tokens)

            if (tokens.length === 1) {
                let token_address = tokens[0];
                setSelectedUserToken(token_address);
                setSelectedUserTokenBalance(userBalances[token_address].balance.toFixed(2));
                setParseLockedAssetInputTextbox(userBalances[token_address].meta.name);

                setAssetLockedPopup(false);
            }
        }
    }

    const ParseAssetInput = (value) => {
        setAssetInput(value);
        setAssetInputName(value);
        const allTokenIds = Object.keys(allWhitelistedTokens);
        if (allTokenIds.length) {
            let tokens = allTokenIds.filter(token => {
                    return token === value || allWhitelistedTokens[token].name.toLowerCase() === value.toLowerCase()
                }
            );

            if (tokens.length === 1) {
                let token_address = tokens[0];
                console.log("Select token: " + token_address)
                let token_details = allWhitelistedTokens[token_address];
                UpdateAssetInputName(token_details.name);
                setAssetInputPrice(0);
                setAssetInputPriceFormatted("");
                GetBalance(token_address);
                UpdatePrice(token_address).then(newPrice => {
                    ValidateAssetInputPrice(newPrice)
                });
                setAssetInputPopup(false);
            }
        }
    }

    const GetWenTokens = async () => {
        let wenTokens = await window.contract.get_tokens({"from_index": 0, "limit": 50});
        return wenTokens;
    }

    const GetWhitelistedTokens = async () => {
        let whitelistedTokens = await window.contract.get_whitelisted_tokens({"from_index": 0, "limit": 100});
        let tokens = {
            "wrap.testnet": {
                    "img": "https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png",
                    "coingecko_name": "near",
                    "decimals": 24,
                    "name": "Wrapped Near"
                }
        }
        /*let tokens = {
            "Near":
                {
                    "img": "https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png",
                    "coingecko_name": "near",
                    "decimals": 24,
                    "name": "Near"
                },
            "c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near":
                {
                    "img": "data:image/png;base64,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",
                    "coingecko_name": "ethereum",
                    "decimals": 18,
                    "name": "Ethereum"
                },
            "6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
                    "coingecko_name": "dai",
                    "decimals": 18,
                    "name": "DAI"
                },
            "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
                    "coingecko_name": "usdc",
                    "decimals": 6,
                    "address": "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                    "name": "USDC"
                },
            "dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
                    "coingecko_name": "tether",
                    "decimals": 6,
                    "name": "USDT"
                },
            "2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near":
                {
                    "img": "https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
                    "coingecko_name": "bitcoin",
                    "decimals": 8,
                    "name": "Bitcoin"
                }
        }*/

        whitelistedTokens.map(token => {
            tokens[token.asset_id] = {
                img: token.metadata.icon,
                decimals: token.metadata.decimals,
                coingecko_name: getCoingeckoMap(token.asset_id),
                name: token.metadata.name
            };
        })

        console.log(tokens);

        return tokens;
    };

    const GetTokenImage = (token) => {
        if (allWhitelistedTokens.hasOwnProperty(token))
            return allWhitelistedTokens[assetInput].img;
        else {
            const tokens = Object.keys(allWhitelistedTokens).filter(token_id => allWhitelistedTokens[token_id].name === token);
            if (tokens.length > 0)
                return allWhitelistedTokens[tokens[0]].img;
            else
                return UNDEFINED_IMAGE;
        }
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
        let block = Object.keys(allWhitelistedTokens).map(token => createTokenObject(token, allWhitelistedTokens[token]));
        return <div className="popup-options">
            {block}
        </div>;
    };

    const createTokenObject = (token, details) => {
        const isActive = token === assetInput;
        return <div className={isActive ? "popup-options-item" : "popup-options-item-inactive"}
                    onClick={() => {
                        ParseAssetInput(token);
                    }} key={token}>
            <img className="popup-option-image"
                 alt={token + " logo"}
                 src={details.img}
            />
            <div className="popup-option-text">{details.name}</div>
        </div>;
    };

    const LockedTokensList = () => {
        let block = Object.keys(userBalances).map(token_id => createLockedTokenObject(token_id, userBalances[token_id]));
        return <div className="popup-options">
            {block}
        </div>;
    }

    const createLockedTokenObject = (token, details) => {
        const isActive = token === selectedUserToken;
        return <div className={isActive ? "popup-options-item" : "popup-options-item-inactive"}
                    onClick={() => {
                        ParseLockedAssetInput(details.meta.name);
                    }} key={token}>
            <img className="popup-option-image"
                 alt={details.meta.name + " logo"}
                 src={details.img}
            />
            <div className="popup-option-text">{details.meta.name}</div>
        </div>;
    };

    const IsLockTypeSet = () => ["Target Price", "Target Date"].includes(lockTypeOutput);


    /* ON LOAD EVENT */
    const OnSignIn = async (allWenTokens, allWhitelistedTokens) => {
        try {

            /*
            await setTokenContracts(allTokens).then(() => {
                console.log(window.token_contracts);
            })*/

            await LoadUserTokens(allWenTokens, allWhitelistedTokens);

        } catch (e) {
            Notify({method: "fail", data: e.message});
        }
    };

    const LoadUserTokens = async (allWenTokens, allWhitelistedTokens) => {
        setLoading(true);
        const wenTokens = Object.keys(allWenTokens);
        let userBalances = [];
        if (wenTokens.length > 0) {
            let promises = wenTokens.map(async token_index => {
                const token = allWenTokens[token_index];
                let token_contract_id = `${token.token_id}.${window.contract.contractId}`
                return GetFtBalance(token_contract_id, token.meta.decimals, false)
            });

            Promise.all(promises).then(values => {
                const balances = Object.keys(values);
                balances.map(balance_index => {
                    let balance = values[balance_index];
                    const token = allWenTokens[balance_index];
                    let token_contract_id = `${token.token_id}.${window.contract.contractId}`
                    if (balance > 0) {
                        userBalances[token_contract_id] = {
                            asset_id: token.asset_id,
                            token_id: token.token_id,
                            balance,
                            meta: token.meta,
                            img: token.meta.icon,
                            locked_token_account_id: token.locked_token_account_id
                        }
                    }
                })
                // console.log("userBalances"); console.log(userBalances);
                setUserBalances(userBalances);

                if (Object.keys(userBalances).length > 0) {
                    let token = Object.keys(userBalances)[0];
                    setSelectedUserToken(token);
                    setSelectedUserTokenBalance(userBalances[token].balance.toFixed(2));
                    setParseLockedAssetInputTextbox(userBalances[token].meta.name);
                }
                setHasUserBalances(Object.keys(userBalances).length > 0);
            })
        }
        setLoading(false);
    }

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

    /*
    const methods = {
        viewMethods: ['ft_balance_of', 'storage_balance_of'],
        changeMethods: [],
    };*/

    /*const AddContractWithPromise = async (key, allTokens) => {
        window.token_contracts[key] = await new nearAPI.Contract(
            window.walletConnection.account(),
            getContractAddress(key), methods);
        return Promise.resolve('ok')
    };*/

    /*const getContractAddress = (token_address) => {
        return token_address;
        // token_address + ".factory.bridge.near";
    }*/

    /*const AddContract = async (key, allTokens) => {
        return AddContractWithPromise(key, allTokens)
    }*/

    /*const setTokenContracts = async (allTokens) => {
        return Promise.all(Object.keys(allTokens).map(key => AddContract(key, allTokens)))
    };*/

    React.useEffect(
        async () => {
            setLoading(true);
            const allWhitelistedTokens = await GetWhitelistedTokens();
            await setAllWhitelistedTokens(allWhitelistedTokens);
            setLoading(false);

            const allWenTokens = await GetWenTokens();
            await setAllWenTokens(allWenTokens);

            if (window.walletConnection.isSignedIn()) {
                await OnSignIn(allWenTokens, allWhitelistedTokens).then(() => {
                    setLoggedIn(true);
                    setAccountId(window.accountId || "Connect wallet");
                })

            } else {
                setLoggedIn(false);
                setAccountId("Connect wallet");
            }

            if (window.accountId) {
                await GetFtBalance(DEFAULT_TOKEN_ACCOUNT_ID, allWhitelistedTokens[DEFAULT_TOKEN_ACCOUNT_ID].decimals, true);
                setTokenInput(0)
            }

            await UpdatePrice(DEFAULT_TOKEN_ACCOUNT_ID, allWhitelistedTokens);
        },
        []
    );

    const GetBalance = (token) => {
        if (token === "Near")
            GetNearBalance().then(balance => {
                if (balance < parseFloat(tokenInput))
                    setTokenInput(0);
            });
        else
            GetFtBalance(token, allWhitelistedTokens[token].decimals, true).then(balance => {
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

    const GetFtBalance = async (token, decimals, updateBalance) => {
        //console.log("GetFtBalance " + token)
        const connection = getNearAccountConnection();
        return new Promise((resolve, reject) => {
            new nearAPI.Account(connection, token).viewFunction(token, "ft_balance_of", {account_id: window.accountId})
                .then(amount => {
                    let balance = amount / Math.pow(10, decimals);

                    if (updateBalance) {
                        setTokenInputAccountBalance(
                            balance > 0
                                ? parseFloat(balance.toFixed(8))
                                : 0
                        );
                    }

                    return resolve(balance);
                }).catch(err => {
                throw (err);
                alert(err);
                return reject(0);
            });
        });
    }

    const UpdatePrice = async (token, whitelistedTokens) => {
        if(whitelistedTokens === undefined)
            whitelistedTokens = allWhitelistedTokens;

        if (token === undefined)
            token = assetInput;

        if (token && whitelistedTokens.hasOwnProperty(token)) {
            let ticker = whitelistedTokens[token].coingecko_name;
            console.log(`Request price for ${ticker} [${token}]`);

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

    const convertTargetPriceOutput = (targetPrice) => {
        if (targetPrice === undefined)
            targetPrice = targetPriceOutput;
        return (targetPrice * 10000).toFixed(0);
    }

    const GetTokenName = async () => {
        return await window.contract.get_token_name({
            token_args: {
                token_id: assetInput,
                target_price: convertTargetPriceOutput()
            }
        });
    }

    const UnlockTokens = async () => {
        let actions = [];
        let token = userBalances[selectedUserToken];
        let decimals = token.meta.decimals;
        if(selectedUserToken && decimals > 0)
        try {
            let amount = 0;
            if (decimals === 18)
                amount = ConvertToE18(tokenLockAmountInput.toString());
            else if (decimals === 24)
                amount = nearAPI.utils.format.parseNearAmount(tokenLockAmountInput.toString());
            else
                throw (`Illegal token decimal: ${decimals}`);

            actions.push([
                PRICE_ORACLE,
                nearAPI.transactions.functionCall(
                    "oracle_call",
                    {
                        receiver_id: selectedUserToken,
                        asset_ids: [token.asset_id],
                        amount,
                        msg: ""
                    },
                    TGas.mul(150).toFixed(0),
                    1
                )]);
            await window._near.sendTransactions(actions).then(resp => console.log(resp));
        } catch (ex) {
            console.log(ex)
        }
    }

    const LockTokens = async () => {
        if (!assetInput || !targetPriceOutput || !allWhitelistedTokens.hasOwnProperty(assetInput)) {
            alert(`No data at LockTokens (${assetInput}, ${assetInputPrice}}`);
        } else {
            let contract_id = await GetTokenName();
            if (contract_id) {
                console.log(`Token ${contract_id} (${assetInput}) is under construction...`);
                let actions = [];
                try {
                    if (!tokenAlreadyCreated) {
                        actions.push(GetCreateTokenAction());
                    }
                    if (await IsStorageDepositRequired(assetInput, contract_id)) {
                        actions.push(GetRegisterTokenContractAction(contract_id));
                    }
                    if (await IsStorageDepositRequired(contract_id, window.accountId)) {
                        actions.push(GetRegisterTokenUserAction(contract_id));
                    }
                    actions.push(GetLockTokensAction(contract_id));

                    await window._near.sendTransactions(actions).then(resp => console.log(resp));
                } catch (ex) {
                    console.log(ex)
                }
            } else {
                alert("Contract_id is missing in LockTokens");
            }
        }
    }

    const IsStorageDepositRequired = async (contract_id, account_id) => {
        const connection = getNearAccountConnection();

        try {
            return await new nearAPI.Account(connection, contract_id).viewFunction(contract_id, "storage_balance_of", {account_id}).then(resp => {
                console.log(`${contract_id} / ${account_id}`);
                console.log(resp);
                return (resp === null || resp.total === '0')
            })
        } catch (e) {
            return true;
        }
    }

    const GetRegisterTokenContractAction = (contract_id) => {
        if (!contract_id || !assetInput) {
            alert(`No data at GetRegisterTokenContractAction (${assetInput}}`);
        } else {
            return [
                assetInput,
                nearAPI.transactions.functionCall(
                    "storage_deposit",
                    {
                        account_id: contract_id,
                        registration_only: true,
                    },
                    TGas.mul(5).toFixed(0),
                    TokenRegisterDeposit.toFixed(0)
                ),
            ];
        }
    }

    const GetRegisterTokenUserAction = (contract_id) => {
        if (!contract_id || !assetInput) {
            alert(`No data at GetRegisterTokenUserAction (${assetInput}}`);
        } else {
            return [
                contract_id,
                nearAPI.transactions.functionCall(
                    "storage_deposit",
                    {
                        account_id: window.accountId,
                        registration_only: true,
                    },
                    TGas.mul(5).toFixed(0),
                    TokenRegisterDeposit.toFixed(0)
                ),
            ];
        }
    }

    const GetCreateTokenAction = () => {
        if (!assetInput || !targetPriceOutput || !allWhitelistedTokens.hasOwnProperty(assetInput)) {
            alert(`No data at GetCreateTokenAction (${assetInput}, ${assetInputPrice}}`);
        } else {
            return [
                window.contract.contractId,
                nearAPI.transactions.functionCall(
                    "create_token",
                    {
                        token_args: {
                            token_id: assetInput,
                            target_price: (targetPriceOutput * 10000).toFixed(0),
                            price_oracle_account_id: config.priceOracle
                        }
                    },
                    TGas.mul(150).toFixed(0),
                    TokenStorageDeposit.toFixed(0)
                ),
            ]
        }
    }

    const GetLockTokensAction = (contract_id) => {
        if (!contract_id || !assetInput || !assetInputPrice || !allWhitelistedTokens.hasOwnProperty(assetInput)) {
            alert(`No data at GetLockTokensAction (${assetInput}, ${assetInputPrice}}`);
        } else {
            let decimals = allWhitelistedTokens[assetInput].decimals;
            let amount = 0;
            if (decimals === 18)
                amount = ConvertToE18(tokenInput.toString());
            else if (decimals === 24)
                amount = nearAPI.utils.format.parseNearAmount(tokenInput.toString());
            else
                throw (`Illegal token decimal: ${decimals}`);

            return [
                assetInput,
                nearAPI.transactions.functionCall(
                    "ft_transfer_call",
                    {
                        receiver_id: contract_id,
                        amount: amount,
                        msg: '',
                    },
                    TGas.mul(150).toFixed(0),
                    1
                ),
            ]
        }
    }

    return (
        <>
            {assetInputPopup && <div data-focus-lock-disabled="false">
                <div>
                    <div className="popup" data-reach-dialog-overlay="">
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
                                               value={assetInputName}
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
            </div>}

            {assetLockedPopup && <div data-focus-lock-disabled="false">
                <div>
                    <div className="popup" data-reach-dialog-overlay="">
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
                                               onChange={e => ParseLockedAssetInput(e.target.value)}
                                               value={parseLockedAssetInputTextbox}
                                        />
                                    </div>
                                    <div className="common-basis-div">
                                        <div className="common-basis-block">
                                            <div className="common-basis">Your portfolio:</div>
                                        </div>
                                        <LockedTokensList/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>}

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

                {currentMode === "Lock" && <div className="lock main">
                    <div className="sub-title">Lock tokens</div>

                    {loading && <div className="form-warning locked">Loading...</div>}

                    <div className="swap-page">
                        {!loading && <div className="grid">
                            <div>
                                <div className="input">
                                    <div className="input-box">
                                        <div className="asset">
                                            <button className="asset-1" onClick={() => setAssetInputPopup(true)}>
                                                <span className="ticker">
                                                    <div className="token">
<img src={GetTokenImage(assetInput)}
     className="token-logo"/>

    <span className="token-name">{assetInputName}</span>

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
                                                        className="input-balance-text">Balance: {tokenInputAccountBalance} {assetInputName}
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
                                                       onChange={e => {
                                                           ParseTargetPriceOutput(e.target.value);
                                                           CheckWenTokenAvailability(e.target.value);
                                                       }}
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
                                                    <div>
                                                        <div className="input-days-difference">
                                                            Days left: {outputDifferenceInDays}
                                                        </div>
                                                        <div className="form-warning">
                                                            <strong>Under contraction</strong>
                                                        </div>
                                                    </div>
                                                    }
                                                    {IsTargetPriceSelected(lockTypeOutput) &&
                                                    <div>
                                                        <div className="input-balance-text">
                                                            Current Price: {assetInputPriceFormatted}
                                                        </div>
                                                        {tokenAlreadyCreated &&
                                                        <div className="lock-info">Token Already
                                                            created: {tokenAlreadyCreatedName}</div>}
                                                        {!tokenAlreadyCreated &&
                                                        <div className="lock-info">Token wasn't created yet. You will
                                                            have to pay ~2.5 NEAR to
                                                            deploy it</div>}
                                                    </div>
                                                    }

                                                    <div className="input-balance-price-error input-error">
                                                        {lockTypeError}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>}


                                    </div>
                                </div>

                            </div>

                        </div>}

                        <div className="separator"/>

                        <div>
                            {loggedIn ?
                                <button className="main-button"
                                        disabled={!!lockTypeError || parseFloat(tokenInput) === 0 || lockTypeOutput === "" || lockTypeOutput === "Target Date"}
                                        onClick={() => LockTokens()}>
                                    <div>Lock</div>
                                </button> :

                                <button className="main-button inactive" onClick={login}>
                                    <div>Connect Wallet</div>
                                </button>
                            }
                        </div>

                    </div>
                </div>}

                {currentMode === "Unlock" && <div className="unlock main">
                    <div className="sub-title">Unlock tokens</div>

                    {loading && <div className="form-warning locked">Loading...</div>}

                    {!loading && !hasUserBalances && <div className="form-warning locked">Locked tokens were not found in your Portfolio</div>}

                    <div className="swap-page">
                        {!loading && hasUserBalances && <div className="grid">
                            <div>
                                <div className="input">
                                    <div className="input-box">
                                        <div className="asset">
                                            <button className="asset-1" onClick={() => setAssetLockedPopup(true)}>
                                                <span className="ticker">
                                                    <div className="token">
<img src={GetTokenImage(userBalances[selectedUserToken].token_id)}
     className="token-logo"/>

    <span className="token-name">{userBalances[selectedUserToken].meta.name}</span>

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
                                                   ref={tokenUnlockRef}
                                                   onChange={e => ParseLockAmountInput(e.target.value)}
                                                   value={tokenLockAmountInput}
                                            />
                                        </div>

                                        {loggedIn && <div className="input-balance">
                                            <div className="input-balance-row">
                                                <div className="input-balance-value">
                                                    <div
                                                        className="input-balance-text">Balance: {selectedUserTokenBalance} {userBalances[selectedUserToken].meta.symbol}
                                                    </div>
                                                    <button className="input-balance-max"
                                                            onClick={() => {
                                                                setTokenLockAmountInput(selectedUserTokenBalance.toString().replace(",", ""))
                                                            }}>(Max)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        }

                                    </div>

                                </div>

                            </div>

                            <div className="input-balance-price-error input-error unlock-errors">
                                {unlockTypeError}
                            </div>

                        </div>}

                        <div className="separator"/>

                        <div>
                            {loggedIn ?
                                <button className="main-button"
                                        disabled={parseFloat(tokenLockAmountInput) === 0 || !hasUserBalances || unlockTypeError !== ""}
                                        onClick={() => UnlockTokens()}>
                                    <div>Unlock</div>
                                </button> :

                                <button className="main-button inactive" onClick={login}>
                                    <div>Connect Wallet</div>
                                </button>
                            }
                        </div>

                    </div>

                </div>}

            </main>
            <Footer appSettings={appSettings}/>
            {showNotification && Object.keys(showNotification) &&
            <Notification config={config} method={showNotification.method} data={showNotification.data}/>}
        </>
    );

}
