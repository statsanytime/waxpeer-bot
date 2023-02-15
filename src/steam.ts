// @ts-ignore
import SteamUser from 'steam-user';
// @ts-ignore
import SteamTotp from 'steam-totp';
// @ts-ignore
import SteamCommunity from 'steamcommunity';
// @ts-ignore
import TradeOfferManager from 'steam-tradeoffer-manager';
import { sendNotification } from './notifications.js';
import 'dotenv/config';

let client = new SteamUser();

let manager = new TradeOfferManager({
	"steam": client,
	"language": "en"
});

let community = new SteamCommunity();

let logOnOptions = {
    "accountName": process.env.STEAM_USERNAME,
    "password": process.env.STEAM_PASSWORD,
    "twoFactorCode": SteamTotp.getAuthCode(process.env.STEAM_SHARED_SECRET)
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
    sendNotification('Logged into Steam');
});

client.on('webSession', (sessionID: any, cookies: any) => {
    manager.setCookies(cookies, (err: any) => {
        if (err) {
            sendNotification('Unable to set cookies for trade offer manager');
            console.error(err);
            process.exit(1);
        }

        sendNotification('Trade offer manager cookies set');
    });

    community.setCookies(cookies);
});

manager.on('sentOfferChanged', function(offer: TradeOfferManager.TradeOffer, oldState: TradeOfferManager.ETradeOfferState) {
	sendNotification(`Offer #${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
});

export function sendOffer(offer: TradeOfferManager.TradeOffer) {
    return new Promise((resolve, reject) => {
        offer.send((err: any, status: string) => {
            if (err) {
                reject(err);
                return;
            }

            sendNotification(`Sent offer. Status: ${status}.`);

            if (status === 'pending') {
                sendNotification(`Offer #${offer.id} needs confirmation.`);

                community.acceptConfirmationForObject(process.env.STEAM_IDENTITY_SECRET, offer.id, function(err: any) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    sendNotification(`Offer ${offer.id} confirmed`);

                    resolve(offer);
                });
            }
        });
    });
}

export {
    manager,
    community,
    client,
};
