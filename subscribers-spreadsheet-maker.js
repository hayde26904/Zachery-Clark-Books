let { Readable } = require("stream");
const { dbGet, dbRun, dbGetAll } = require('./database');
const path = require('path');
let xlsx = require("xlsx");
const { get } = require("http");

xlsx.stream.set_readable(Readable);

async function getSubscribers() {
    const subscribers = await dbGetAll("SELECT * FROM subscribers");
    subscribers.forEach(subscriber => {
        subscriber.email = subscriber.email.trim();
        subscriber.unsubscribeURL = `${process.env.URL}/unsubscribe/${subscriber.token}`;
        delete subscriber.token;
    });
    return subscribers;
}

function createSubscribersSpreadsheet(subscribers) {
    const worksheet = xlsx.utils.json_to_sheet(subscribers);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.sheet_add_json(worksheet, subscribers, { origin: "A1" });
    xlsx.utils.book_append_sheet(workbook, worksheet, "Subscribers");
    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
    getSubscribers,
    createSubscribersSpreadsheet
}