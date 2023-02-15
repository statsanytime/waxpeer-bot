import WebSocket from 'ws';
import TradeOfferManager from 'steam-tradeoffer-manager';
import { manager, sendOffer, cancelOffer } from './steam.js';
import { sendNotification } from './notifications.js';
import 'dotenv/config';

const ws = new WebSocket('wss://wssex.waxpeer.com');

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
