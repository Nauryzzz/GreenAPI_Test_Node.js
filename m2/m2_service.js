const express = require("express");
const amqp = require("amqplib");

const PORT = process.env.PORT || 4000;
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

        channelResp = await connection.createChannel();
        await channelResp.assertQueue(amqpQueueResp);

        return true;
    } catch (error) {
        console.log("amqp error:" + error.message);
        return false;
    }
}

app.listen(PORT, async () => {
    console.log(`Service m2 started at port "${PORT}"`);

    if (await connectRMQ()) {
        console.log(`Service m2 connected to RabbitMQ "${amqpServer}" and listen to queue "${amqpQueueReq}"`);

        channelReq.consume(amqpQueueReq, (reqData) => {
            try {
                let msgReq = reqData.content.toString();
                let timeReq = new Date(Date.now()).toLocaleString();

                console.log(`${timeReq}: Request-message: "${msgReq}"`);
                channelReq.ack(reqData);

                let msgResp = msgReq.split(" ").reverse().join(" ");
                let timeResp = new Date(Date.now()).toLocaleString();

                channelResp.sendToQueue(amqpQueueResp, Buffer.from(msgResp));

                console.log(`${timeResp}: Response-message "${msgResp}"`);
            } catch (error) {
                console.log("Error at responding message to queue: " + error.message);
            }
        });
    }
});

process.on("beforeExit", () => {
    connection.close();
});
