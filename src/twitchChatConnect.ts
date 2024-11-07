
const CHAT_CHANNEL_USER_ID = 'HelmiBlub';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';

var websocketSessionID: string = "";

function connect() {
    console.log("start connecting websocket");
    let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
    websocketClient.addEventListener("error", (data) => {
        console.log("websocket error", data);
    });
    websocketClient.addEventListener("open", (data) => {
        console.log("websocket opened", data);
    });
    websocketClient.addEventListener("close", (data) => {
        console.log("websocket closed", data);
    });
    websocketClient.addEventListener("message", (data) => {
        console.log("websocket message received");
        handleMessage(JSON.parse(data.data));
    });

    return websocketClient;
}

function handleMessage(data: any) {
    switch (data.metadata.message_type) {
        case 'session_welcome':
            console.log("welcome message received");
            websocketSessionID = data.payload.session.id;
            registerEventSubListeners();
            break;
        case 'notification':
            switch (data.metadata.subscription_type) {
                case 'channel.chat.message':
                    console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);
                    break;
            }
            break;
    }
}

async function registerEventSubListeners() {
    console.log("subscribe for chat messages");
    let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'channel.chat.message',
            version: '1',
            condition: {
                broadcaster_user_id: CHAT_CHANNEL_USER_ID,
                user_id: "justinfan53268"
            },
            transport: {
                method: 'websocket',
                session_id: websocketSessionID
            }
        })
    });

    if (response.status != 202) {
        let data = await response.json();
        console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
        console.error(data);
    } else {
        const data = await response.json();
        console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
    }
}
//connect();