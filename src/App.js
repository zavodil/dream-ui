import 'regenerator-runtime/runtime'
import React from 'react'
import {login, logout} from './utils'
import * as nearAPI from 'near-api-js'
import 'react-dropdown/style.css';
import './global.css'
import './app.css'
import {useDetectOutsideClick} from "./includes/useDetectOutsideClick";
import {Header, Footer, Notification} from "./includes/pageParts";
import * as nearFunctions from "/includes/nearFunctions";

import getConfig from './config'
import getAppSettings from './app-settings'

const appSettings = getAppSettings();
const config = getConfig(process.env.NODE_ENV || 'development');
const FRAC_DIGITS = 5;

export default function App() {
    const [buttonDisabled, setButtonDisabled] = React.useState(false)
    const [showNotification, setShowNotification] = React.useState(false)
    const navDropdownRef = React.useRef(null);
    const [isNavDropdownActive, setIsNaVDropdownActive] = useDetectOutsideClick(navDropdownRef, false);

    /* APP STATE */
    const [input, setInput] = React.useState("");
    const [deposit, setDeposit] = React.useState(0);

    /* APP */
    const inputChange = (value) => {
        setInput(value);
        setButtonDisabled(!parseFloat(value) || parseFloat(value) < 0);
    };

    const AppContent = () => {
        return (
            <>
                <Header onClick={NavMenuOnClick}
                        config={config}
                        deposit={deposit}
                        navDropdownRef={navDropdownRef}
                        isNavDropdownActive={isNavDropdownActive}
                        appSettings={appSettings}/>
                <main>
                    <div className="background-img"/>
                    <h1>
                        {appSettings.appFullNme}
                    </h1>
                    <form onSubmit={async event => {
                        event.preventDefault()

                        const {fieldset} = event.target.elements;

                        console.log(input);

                        if (input) {
                            fieldset.disabled = true

                            try {
                                await window.contract.send({}, 300000000000000, nearFunctions.ConvertToYoctoNear(1))
                            } catch (e) {
                                nearFunctions.ContractCallAlert();
                                Notify({method: "fail", data: e.message});
                                throw e
                            } finally {
                                fieldset.disabled = false
                            }

                            Notify({method: "call", data: "send"});
                        }
                    }}>
                        <fieldset id="fieldset">
                            <label
                                htmlFor="deposit"
                                style={{
                                    display: 'block',
                                    color: 'var(--gray)',
                                    marginBottom: '0.5em'
                                }}
                            >
                                Test:
                            </label>
                            <div style={{display: 'flex'}}>
                                <input
                                    autoFocus
                                    autoComplete="off"
                                    defaultValue={input}
                                    id="deposit"
                                    onChange={e => inputChange(e.target.value)}
                                    style={{flex: 1}}
                                />
                                <button
                                    disabled={buttonDisabled}
                                    style={{borderRadius: '0 5px 5px 0'}}
                                >
                                    Send
                                </button>
                            </div>
                        </fieldset>
                    </form>
                    <div className={"hints"}>
                        <ul>
                            <li>
                                Test
                            </li>
                        </ul>
                    </div>
                </main>
                <Footer appSettings={appSettings}/>
                {showNotification && Object.keys(showNotification) &&
                <Notification config={config} method={showNotification.method} data={showNotification.data}/>}
            </>
        );
    };

    /* ON LOAD EVENT */
    const OnSignIn = async () => {
        try {
            const value = await window.contract.get_deposit({
                account_id: window.accountId
            });

            setInput(value);
            return value;
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

    React.useEffect(
        async () => {
            if (window.walletConnection.isSignedIn()) {
                await OnSignIn();
            }
        },
        []
    );

    /* LOGIN SCREEN */
    if (!window.walletConnection.isSignedIn()) {
        return (
            <>
                <Header onClick={NavMenuOnClick}
                        config={config}
                        deposit={deposit}
                        navDropdownRef={navDropdownRef}
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

    return (
        <AppContent/>
    );
}