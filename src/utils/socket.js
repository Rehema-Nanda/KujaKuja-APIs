const pg = require("pg");

const environment = process.env.NODE_ENV || "development";

let dbHost = "localhost";
if (environment === "production") {
    dbHost = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
}

/**
 * Initializes a new pg client
 */
const pgClient = new pg.Client({
    user: `${process.env.SQL_USER}`,
    host: dbHost,
    database: `${process.env.SQL_DATABASE}`,
    password: `${process.env.SQL_PASSWORD}`,
});

pgClient.connect((err) => {
    if (err) {
        console.log("ERROR CONNECTING TO PG CLIENT =>", err);
    }
    else {
        console.log("PG CLIENT CONNECION WAS A SUCESSS.");
    }
});

/**
 *  Array of all pg notification channels and their respective event to be emitted
 */
const channelsArray = [
    { name: "tag_filter_table_changed", event: "tagFilterTableChanged" },
];

/**
 * Listen queries for all pg notification channels
 */

channelsArray.forEach((channel) => {
    pgClient.query(`LISTEN ${channel.name}`);
});

/**
 * Handles all notifications
 */
function socketIo(io) {
    io.on("connection", async (client) => {
        client.emit("connected", { connected: true });
        console.log("Socket connected");
        client.on("disconnect", () => {
            console.log("Socket disconnected");
            client.emit("disconnected", { connected: false });
        });

        client.on("listening for tag filter change", () => {
            pgClient.on("notification", (notification) => {
                const channel = channelsArray.find((c) => c.name === notification.channel );

                if (channel) {
                    client.emit(channel.event);
                }
            });
        });
    });
}

module.exports = socketIo;
