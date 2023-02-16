import WebSocket from 'ws';
import { manager, sendOffer, cancelOffer, login as loginSteam } from './steam.js';
import { sendNotification } from './notifications.js';
import 'dotenv/config';

interface JsonTradeofferAsset {
    appid: number;
    contextid: string;
    amount: number;
    assetid: string;
};

interface JsonTradeoffer {
    newversion: boolean;
    version: number;
    me: {
        assets: JsonTradeofferAsset[];
        currency: any[];
        ready: boolean;
    };
    them: {
        assets: JsonTradeofferAsset[];
        currency: any[];
        ready: boolean;
    };
}

let reconnectAttemptsLeft: number = 5;
let reconnectAttemptDelay: number[] = [0, 5000, 10000, 20000, 30000];
let ws: WebSocket;

async function handleSendTrade(data: any) {
    const offer = manager.createOffer(data.tradelink);

    const JsonTradeoffer: JsonTradeoffer = data.json_tradeoffer;

    if (JsonTradeoffer.me.assets.length > 1) {
        await sendNotification('Trade offer should only contain one item. Skipping.');
        return;
    }

    offer.addMyItems(JsonTradeoffer.me.assets);

    sendOffer(offer)
    .then(() => {
        sendNotification('Offer sent for ' + JsonTradeoffer.me.assets.map((e: JsonTradeofferAsset) => e.assetid).join(', '));
    })
    .catch((err: any) => {
        sendNotification('Error sending offer');
        console.error(err);
    });
}

function handleCancelTrade(data: any) {
    cancelOffer(data.trade_id)
    .then(() => {
        sendNotification(`Cancelled trade ${data.trade_id}`);
    })
    .catch((err: any) => {
        sendNotification(err.message || `Error cancelling trade ${data.trade_id}. Please cancel it manually.`);
        console.error(err);
    });
}

function connect() {
    ws = new WebSocket('wss://wssex.waxpeer.com');

    ws.on('open', function open() {
        sendNotification('Connected to Waxpeer WebSocket');
    
        ws.send(JSON.stringify({
            "name": "auth",
            "steamid": process.env.STEAM_ID,
            "apiKey": process.env.WAXPEER_API_KEY,
            "tradeurl": process.env.STEAM_TRADE_LINK,
        }));
    
        setInterval(() => {
            ws.send(JSON.stringify({
                "name": "ping",
            }));
        }, 25000);

        reconnectAttemptsLeft = 5;
    });
    
    ws.on('message', function message(data) {
        let message = JSON.parse(data.toString());
    
        if (message.name === 'send-trade') {
            handleSendTrade(message.data);
        }
    
        if (message.name === 'cancelTrade') {
            handleCancelTrade(message.data);
        }
    });
    
    ws.on('close', function close() {
        if (reconnectAttemptsLeft > 0) {
            let delay = reconnectAttemptDelay[5 - reconnectAttemptsLeft];

            sendNotification(`Disconnected from Waxpeer WebSocket. Reconnecting in ${delay / 1000} seconds...`);

            setTimeout(() => {
                connect();
            }, delay);

            reconnectAttemptsLeft--;
        } else {
            sendNotification('Disconnected from Waxpeer WebSocket. Reconnecting failed.');
        }
    });

    ws.on('error', function error(err) {
        sendNotification('Error connecting to Waxpeer WebSocket');
        console.error(err);
    });
}

loginSteam();
connect();
