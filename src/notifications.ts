import axios from 'axios';
import 'dotenv/config';

export async function sendNotification(content: string) {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        content,
    });

    console.log(content);
};
