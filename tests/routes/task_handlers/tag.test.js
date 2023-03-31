const request = require("supertest");
const moment = require("moment");
const app = require("../../../src/app");

// TODO: figure out how to mock @slack/web-api

describe("/tasks/tag/bulk_tag", () => {

    beforeEach(async () => {

        const todayMidday = moment.utc()
            .hours(12)
            .startOf("hour"); // fix the time for easier assertions later

        const eightDaysAgoFormatted = todayMidday.clone()
            .subtract(8, "days")
            .format();
        const fourDaysAgoFormatted = todayMidday.clone()
            .subtract(4, "days")
            .format();
        const threeDaysAgoFormatted = todayMidday.clone()
            .subtract(3, "days")
            .format();
        const twoDaysAgoFormatted = todayMidday.clone()
            .subtract(2, "days")
            .format();
        const oneDayAgoFormatted = todayMidday.clone()
            .subtract(1, "days")
            .format();

        // create some responses with ideas
        await knex("responses")
            .insert([
                {
                    service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                    idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
                    created_at: eightDaysAgoFormatted,
                    updated_at: eightDaysAgoFormatted,
                },
                {
                    service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                    idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
                    created_at: fourDaysAgoFormatted,
                    updated_at: fourDaysAgoFormatted,
                },
                {
                    service_point_id: 2, // "Reception Center", Protection, Nakivale Base Camp, Uganda
                    idea: "Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.",
                    created_at: threeDaysAgoFormatted,
                    updated_at: threeDaysAgoFormatted,
                },
                {
                    service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                    satisfied: false,
                    idea: "Three: Monitor users to ensure water points at the tap are kept clean.",
                    created_at: twoDaysAgoFormatted,
                    updated_at: twoDaysAgoFormatted,
                },
                {
                    service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                    satisfied: true,
                    idea: "Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.",
                    created_at: oneDayAgoFormatted,
                    updated_at: oneDayAgoFormatted,
                },
                {
                    service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                    idea: "Five: Give regular assignments to pupils",
                    created_at: twoDaysAgoFormatted,
                    updated_at: twoDaysAgoFormatted,
                },
                {
                    satisfied: true,
                    service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                    created_at: oneDayAgoFormatted,
                    updated_at: oneDayAgoFormatted,
                },
            ]);

        await knex("tags").insert([
            {
                id: 6,
                response_id: 1,
                name: "aqua99",
            },
        ]);

        await knex("tag_filters")
            .insert([
                {
                    id: 1,
                    tag_text: "water1",
                    search_text: "aqua|water",
                    start_date: eightDaysAgoFormatted,
                    end_date: todayMidday,
                },
                {
                    id: 2,
                    tag_text: "Aqua2",
                    search_text: "aqua|water",
                    start_date: fourDaysAgoFormatted,
                    end_date: todayMidday,
                },
                {
                    id: 3,
                    tag_text: "school",
                    search_text: "assignement|books",
                },
            ]);

        await knex("tag_actors")
            .insert([
                {
                    id: 6,
                    actor_entity_type: "user",
                    actor_entity_id: 2,
                },
            ]);

        await knex("tag_provenance")
            .insert([
                {
                    tag_id: 6,
                    tag_actor_id: 6,
                    action_uuid: "2342335-434-5543-45348374448",
                },
            ]);
    });

    test("GET /tasks/tag/bulk_tag/:id happy path", async () => {
        const response = await request(app)
            .get("/tasks/tag/bulk_tag/1")
            .set("Content-Type", "application/octet-stream")
            .timeout(60000);
        expect(response.statusCode)
            .toBe(200);
    });

    test("/tasks/tag/bulk_tag and undo - happy path", async () => {

        await knex("tag_filters")
            .where("id", 1)
            .update("status", "QUEUED");

        const payload = {
            threadTs: 0,
        };
        // perform bulk tagging for tag filter id 1
        const response = await request(app)
            .post("/tasks/tag/bulk_tag")
            .set("Content-Type", "application/octet-stream")
            .send((JSON.stringify(payload)).toString("base64"))
            .timeout(60000);

        expect(response.statusCode).toBe(200);

        const tagActor = await knex("tag_actors")
            .where("actor_entity_type", "FILTER")
            .andWhere("actor_entity_id", 1);
        expect(tagActor.length).toBe(1);

        const tagProvenance = await knex("tag_provenance").where("tag_actor_id", tagActor[0].id);
        expect(tagProvenance.length).toBe(3);

        // undo bulk tagging for tag filter id 1
        const response2 = await request(app)
            .get("/tasks/tag/bulk_tag/undo/1")
            .timeout(30000);

        expect(response2.statusCode).toBe(200);

        const tagActor2 = await knex("tag_actors")
            .where("actor_entity_type", "FILTER")
            .andWhere("actor_entity_id", 1);

        expect(tagActor2.length).toBe(0);

    });

});
