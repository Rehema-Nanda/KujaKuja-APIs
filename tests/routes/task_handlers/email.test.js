const request = require("supertest");
const sgMail = require("@sendgrid/mail");
const app = require("../../../src/app");

// TODO: figure out how to properly mock @sendgrid/mail
sgMail.send = jest.fn(() => {
    return Promise.resolve();
});

describe("POST /tasks/email/datafix_audit", () => {
    test("happy path", async () => {
        const requestBody = {
            newValue: "454",
            oldValue: "14",
            updateType: "Service Point Id",
            locationName: "ARC Kismayo",
            ids: ["1600046"],
            email: "kujakuja@atomicdata.com",
            reverseQuery: {
                sql: "update \"responses\" set \"service_point_id\" = $1, \"updated_at\" = $2 where \"id\" in ($3)",
                bindings: ["14", "CURRENT_TIMESTAMP", 1600046],
            },
        };

        await request(app)
            .post("/tasks/email/datafix_audit")
            .set("Content-Type", "application/octet-stream")
            .send((JSON.stringify(requestBody)).toString("base64"));

        expect(sgMail.send).toHaveBeenCalled();

        const messageHistoryEntry = await knex("message_history").first();
        expect(messageHistoryEntry.event).toBe("DATAFIX_AUDIT");
        expect(messageHistoryEntry.source).toBe("SYSTEM");
        expect(messageHistoryEntry.destination).toBe("EMAIL");
        expect(messageHistoryEntry.destination_detail).toEqual({
            to: ["kujakuja@atomicdata.com"],
            from: "website@kujakuja.com",
            subject: "Data Fix Applied (kujakuja-dev)",
        });
        expect(messageHistoryEntry.body).toContain(requestBody.email);
        expect(messageHistoryEntry.body).toContain("Environment name: kujakuja-dev");
        expect(messageHistoryEntry.body).toContain(`Type of change: Update ${requestBody.updateType}`);
        expect(messageHistoryEntry.body).toContain(`No. of responses affected: ${requestBody.ids.length}`);
        expect(messageHistoryEntry.body).toContain(`New ${requestBody.updateType}: ${requestBody.newValue}`);
        expect(messageHistoryEntry.body).toContain(`Old ${requestBody.updateType}: ${requestBody.oldValue}`);
        expect(messageHistoryEntry.body).toContain(`Affected response IDs: ${requestBody.ids[0]}`);
        expect(messageHistoryEntry.body).toContain(`sql: ${requestBody.reverseQuery.sql}`);
        expect(messageHistoryEntry.body).toContain(`bindings: ${requestBody.reverseQuery.bindings}`);
    });
});
