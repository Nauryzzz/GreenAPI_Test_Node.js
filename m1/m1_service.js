const express = require("express");
const amqp = require("amqplib");

const PORT = process.env.PORT || 3000;
const amqpServer = "amqp://localhost:5672";
const amqpQueueReq = "greenapi_req";
const amqpQueueResp = "greenapi_resp";
const app = express();

let connection;
let channelReq, channelResp;

async function connectRMQ() {
    try {
        connection = await amqp.connect(amqpServer);

        channelReq = await connection.createChannel();
        await channelReq.assertQueue(amqpQueueReq);

        return true;
    } catch (error) {
        console.log("amqp error:" + error.message);
        return false;
    }
}

app.listen(PORT, async () => {
    console.log(`Service m1 started at port "${PORT}"`);

    if (await connectRMQ()) {
        console.log(`Service m1 connected to RabbitMQ "${amqpServer}"`);
    }
});

async function getResponse() {
    return await new Promise((resolve, reject) => {
        channelResp.consume(amqpQueueResp, (respData) => {
            try {
                let msgResp = respData.content.toString();
                let timeResp = new Date(Date.now()).toLocaleString();

                console.log(`${timeResp}: Response: "${msgResp}"`);
                channelResp.ack(respData);

                resolve(msgResp);
            } catch (error) {
                reject("Error at receiving message from queue: " + error.message);
            }
        });
    });
}

app.get("/m1/:sentence", async (req, resp) => {
    let msgReq = req.params.sentence;
    let timeReq = new Date(Date.now()).toLocaleString();

    try {
        channelReq.sendToQueue(amqpQueueReq, Buffer.from(msgReq));
        console.log(`${timeReq}: Request: "${msgReq}"`);
    } catch (error) {
        console.log("Error at sending message to queue:" + error.message);
    }

    try {
        channelResp = await connection.createChannel();
        await channelResp.assertQueue(amqpQueueResp);

        resp.send(await getResponse());

        channelResp.close();
    } catch (error) {
        console.log(error.message);
    }
});

process.on("beforeExit", () => {
    connection.close();
});
