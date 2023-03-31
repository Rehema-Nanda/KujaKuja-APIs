/* eslint-disable no-undef */ // prevents globals from being marked as undefined

const request = require("supertest");
const moment = require("moment");
const uuid = require("uuid/v4");
const app = require("../../src/app");

describe('POST /api/v3/responses', () => {

    test('happy path', async () => {
        let now = moment();
        let uniqueId = uuid();

        let requestBody = [{
            "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
            "satisfied": true,
            "lat": 1.0,
            "lng": 1.0,
            "created_at": now.format(),
            "unique_id": uniqueId
        }];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        let insertedResponse = await knex('responses').first();
        // properties in the request body:
        expect(insertedResponse.service_point_id).toBe(requestBody[0].service_point_id.toString());
        expect(insertedResponse.satisfied).toBe(requestBody[0].satisfied);
        expect(insertedResponse.lat).toBe(requestBody[0].lat.toFixed(8));
        expect(insertedResponse.lng).toBe(requestBody[0].lng.toFixed(8));
        expect(insertedResponse.created_at).toStrictEqual(moment(requestBody[0].created_at).toDate());
        expect(insertedResponse.unique_id).toBe(requestBody[0].unique_id);
        // properties set by the endpoint:
        expect(now.diff(insertedResponse.updated_at, 'seconds')).toBe(0);
        expect(now.diff(insertedResponse.uploaded_at, 'seconds')).toBe(0);
        expect(insertedResponse.user_id).toBe(testData.surveyUser.id);
        // all other properties, except id:
        expect(insertedResponse.idea).toBeNull();
        expect(insertedResponse.phase2_id).toBeNull();
        expect(insertedResponse.response_type).toBe('');
        expect(insertedResponse.is_starred).toBe(false);
        expect(insertedResponse.nlp_extract_adjectives_processed).toBe(false);
    });

    test('explicit time zone diff', async () => {
        let now = moment().utcOffset(180);
        let uniqueId = uuid();

        let requestBody = [{
            "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
            "satisfied": true,
            "lat": 1.0,
            "lng": 1.0,
            "created_at": now.format(),
            "unique_id": uniqueId
        }];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        let insertedResponse = await knex('responses').first();
        // properties in the request body:
        expect(insertedResponse.service_point_id).toBe(requestBody[0].service_point_id.toString());
        expect(insertedResponse.satisfied).toBe(requestBody[0].satisfied);
        expect(insertedResponse.lat).toBe(requestBody[0].lat.toFixed(8));
        expect(insertedResponse.lng).toBe(requestBody[0].lng.toFixed(8));
        expect(insertedResponse.created_at).toStrictEqual(moment(requestBody[0].created_at).toDate());
        expect(insertedResponse.unique_id).toBe(requestBody[0].unique_id);
        // properties set by the endpoint:
        expect(now.diff(insertedResponse.updated_at, 'seconds')).toBe(0);
        expect(now.diff(insertedResponse.uploaded_at, 'seconds')).toBe(0);
        expect(insertedResponse.user_id).toBe(testData.surveyUser.id);
        // all other properties, except id:
        expect(insertedResponse.idea).toBeNull();
        expect(insertedResponse.phase2_id).toBeNull();
        expect(insertedResponse.response_type).toBe('');
        expect(insertedResponse.is_starred).toBe(false);
        expect(insertedResponse.nlp_extract_adjectives_processed).toBe(false);
    });

    test('unauthenticated user results in 401', async () => {
        let requestBody = [{
            "contents": "shouldn't matter"
        }];

        const response = await request(app).post('/api/v3/responses').send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe('Unauthorized');
    });

    test('empty or non-array request body results in 422', async () => {
        const response1 = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send('');
        expect(response1.statusCode).toBe(422);
        expect(response1.body.error).toBe('Missing data');

        const response2 = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send({key: "value"});
        expect(response2.statusCode).toBe(422);
        expect(response2.body.error).toBe('Invalid data');
    });

    test('non-privileged user results in 401', async () => {
        let requestBody = [{
            "contents": "shouldn't matter"
        }];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe('Insufficient permissions');
    });

    test('service provider user results in 401', async () => {
        let requestBody = [{
            "contents": "shouldn't matter"
        }];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.serviceProviderUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe('Insufficient permissions');
    });

    test('lat & long are set to service point lat & long if not supplied', async () => {
        let now = moment();
        let uniqueId = uuid();

        let requestBody = [{
            "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
            "satisfied": true,
            "lat": null,
            "lng": null,
            "created_at": now.format(),
            "unique_id": uniqueId
        }];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        let insertedResponse = await knex('responses').first();
        expect(insertedResponse.lat).toBe(testData.defaultServicePoint.lat);
        expect(insertedResponse.lng).toBe(testData.defaultServicePoint.lng);
    });

    test('transaction rolls back all inserted responses on failure', async () => {
        let now = moment();
        let uniqueId1 = uuid();
        let uniqueId2 = uuid();

        let requestBody = [
            // this one should insert without any issues:
            {
                "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
                "satisfied": true,
                "lat": 1.0,
                "lng": 1.0,
                "created_at": now.format(),
                "unique_id": uniqueId1
            },
            // this one is missing the 'satisfied' key and should result in a validation failure:
            {
                "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
                "lat": 1.0,
                "lng": 1.0,
                "created_at": now.format(),
                "unique_id": uniqueId2
            }
        ];

        const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(422);
        expect(response.body.error.hasOwnProperty('satisfied')).toBe(true);

        let responseCount = await knex('responses').count('*');
        expect(responseCount[0].count).toBe("0");
    });

    test('duplicate responses are ignored', async () => {
        let now = moment();
        let uniqueId = uuid();

        let requestBody = [{
            "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
            "satisfied": true,
            "lat": 1.0,
            "lng": 1.0,
            "created_at": now.format(),
            "unique_id": uniqueId
        }];

        let response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        let responseCount = await knex('responses').count('*');
        expect(responseCount[0].count).toBe("1");

        // submit the same response again
        response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        responseCount = await knex('responses').count('*');
        expect(responseCount[0].count).toBe("1");
    });

    describe('validation', () => {

        test('missing required field', async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = [{
                "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
                "lat": 1.0,
                "lng": 1.0,
                "created_at": now.format(),
                "unique_id": uniqueId
            }];

            const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error.hasOwnProperty('satisfied')).toBe(true);
            expect(response.body.error.satisfied[0].keyword).toBe('required');
            expect(response.body.error.satisfied[0].message).toBe('is a required property');
        });

        test('incorrect type', async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = [{
                "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
                "satisfied": "should be a boolean",
                "lat": 1.0,
                "lng": 1.0,
                "created_at": now.format(),
                "unique_id": uniqueId
            }];

            const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error.hasOwnProperty('satisfied')).toBe(true);
            expect(response.body.error.satisfied[0].keyword).toBe('type');
            expect(response.body.error.satisfied[0].message).toBe('should be boolean');
        });

        test('non-ISO8601 created_at datetime results in 422', async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = [{
                "service_point_id": parseInt(testData.defaultServicePoint.id, 10),
                "satisfied": true,
                "lat": 1.0,
                "lng": 1.0,
                "created_at": now.format('YYYY/MM/DD HH:mm:ss'),
                "unique_id": uniqueId
            }];

            const response = await request(app).post('/api/v3/responses').set('Authorization', `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error.hasOwnProperty('created_at')).toBe(true);
            expect(response.body.error.created_at[0].keyword).toBe('format');
            expect(response.body.error.created_at[0].message).toBe('should match format "date-time"');
        });

    });

});

describe("POST /api/v3/responses/ideas", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later

        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format();
        const fourDaysAgoFormatted = todayMidday.clone().subtract(4, "days").format();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
        const twoDaysAgoFormatted = todayMidday.clone().subtract(2, "days").format();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();

        // create some responses with ideas
        await knex("responses").insert([
            // this first response should be excluded by the default start-to-end time range that the endpoint uses if
            // no start and end are passed in
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
            // this last response should always be excluded as the 'idea' is null
            {
                satisfied: true,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
            },
        ]);

        await knex("tags").insert([
            {
                response_id: 2,
                name: "homework",
            },
            {
                response_id: 3,
                name: "nohomework",
            },
        ]);
    });

    test("happy path", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");

        const expectedStartDateFormatted = todayMidday.clone().hours(0).subtract(7, "days").format();
        const expectedEndDateFormatted = todayMidday.clone().hours(0).format();

        // using toISOString() instead of format() here because that is how the values are serialized when they come
        // from the DB (toISOString() includes milliseconds while format() does not)
        const fourDaysAgoFormatted = todayMidday.clone().subtract(4, "days").toISOString();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").toISOString();
        const twoDaysAgoFormatted = todayMidday.clone().subtract(2, "days").toISOString();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").toISOString();

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe(expectedStartDateFormatted);
        expect(response.body.dates.end).toBe(expectedEndDateFormatted);
        expect(response.body.count).toBe(4);
        expect(response.body.satisfied).toBe(1);

        expect(response.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[0].idea_language).toBe("en");
        expect(response.body.data[0].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[0].is_starred).toBe(false);
        expect(response.body.data[0].name).toBe("Mahama Camp");
        expect(response.body.data[0].tags).toBe("");

        expect(response.body.data[1].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
        expect(response.body.data[1].idea_language).toBe("en");
        expect(response.body.data[1].created_at).toBe(twoDaysAgoFormatted);
        expect(response.body.data[1].is_starred).toBe(false);
        expect(response.body.data[1].name).toBe("Mahama Camp");
        expect(response.body.data[0].tags).toBe("");

        expect(response.body.data[2].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[2].idea_language).toBe("en");
        expect(response.body.data[2].created_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[2].is_starred).toBe(false);
        expect(response.body.data[2].name).toBe("Nakivale Base Camp");
        expect(response.body.data[2].tags).toBe("nohomework");

        expect(response.body.data[3].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
        expect(response.body.data[3].idea_language).toBe("en");
        expect(response.body.data[3].created_at).toBe(fourDaysAgoFormatted);
        expect(response.body.data[3].is_starred).toBe(false);
        expect(response.body.data[3].name).toBe("Nakivale Base Camp");
        expect(response.body.data[3].tags).toBe("homework");
    });

    test("service provider user results in 200", async () => {
        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe("Insufficient permissions");
    });

    test("invalid start date results in 400", async () => {
        const requestBody = {
            start: "21 Nov 2018",
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("invalid end date results in 400", async () => {
        const requestBody = {
            end: "21-11-2018",
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("start date and end date get swapped if start > end", async () => {
        const requestBody = {
            start: "2018-11-03",
            end: "2018-11-01",
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe("2018-11-01T00:00:00Z");
        expect(response.body.dates.end).toBe("2018-11-03T00:00:00Z");
        expect(response.body.count).toBe(0);
    });

    test("responses from disabled countries are excluded", async () => {
        // update Uganda to be disabled
        await knex("countries").where("name", "Uganda").update({ enabled: false });

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[1].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
    });

    test("date filter", async () => {
        const now = moment.utc().startOf("day");
        const eightDaysAgo = now.clone().subtract(8, "days");
        const twoDaysAgo = now.clone().subtract(2, "days");

        const requestBody = {
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: twoDaysAgo.format("YYYY-MM-DD"),
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe(eightDaysAgo.format());
        expect(response.body.dates.end).toBe(twoDaysAgo.format());
        expect(response.body.count).toBe(3);
        expect(response.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
        expect(response.body.data[2].idea).toBe("Zero: Tap monitors should ensure stagnant water is effectively treated");
    });

    test("country filter", async () => {
        const requestBody = {
            countries: [1], // Uganda
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("location filter", async () => {
        const requestBody = {
            settlements: [2], // Mahama Camp
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[1].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
    });

    test("service point filter", async () => {
        const requestBody = {
            points: [1], // "Talking Stick", Water, Nakivale Base Camp, Uganda
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("service type filter", async () => {
        const requestBody = {
            types: [4], // Nutrition
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
    });

    test("keyword filter (full-text search)", async () => {
        const today = moment.utc().startOf("day");
        const eightDaysAgo = today.clone().subtract(8, "days");

        let requestBody = {
            keyword: "three", // comparison should be case-insensitive,
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(1);
        expect(response1.body.data[0].idea).toBe("<em>Three</em>: Monitor users to ensure water points at the tap are kept clean.");

        requestBody = {
            keyword: "WATER", // comparison should be case-insensitive
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(3);
        expect(response2.body.data[0].idea).toBe("Three: Monitor users to ensure <em>water</em> points at the tap are kept clean.");
        expect(response2.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean <em>water</em>.");
        expect(response2.body.data[2].idea).toBe("Zero: Tap monitors should ensure stagnant <em>water</em> is effectively treated");

        requestBody = {
            keyword: "Tap monitors", // comparison should include 'tap' and 'monitors' in any order and with different conjugations
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response3 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response3.statusCode).toBe(200);
        expect(response3.body.count).toBe(4);
        expect(response3.body.data[0].idea).toBe("Three: <em>Monitor</em> users to ensure water points at the <em>tap</em> are kept clean.");
        expect(response3.body.data[1].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to chlorinate stagnant H2O at the <em>tap</em>.");
        expect(response3.body.data[2].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean water.");
        expect(response3.body.data[3].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant water is effectively treated");

        requestBody = {
            keyword: 'water "Tap Monitors"', // comparison should include the words 'tap' and 'monitors' TOGETHER and 'water' before or after
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response4 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response4.statusCode).toBe(200);
        expect(response4.body.count).toBe(2);
        expect(response4.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean <em>water</em>.");
        expect(response4.body.data[1].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant <em>water</em> is effectively treated");

        requestBody = {
            keyword: '"Tap monitors" stagnant', // comparison should include the words 'tap' and 'monitors' TOGETHER and 'stagnant' before or after
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response5 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response5.statusCode).toBe(200);
        expect(response5.body.count).toBe(2);
        expect(response5.body.data[0].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to chlorinate <em>stagnant</em> H2O at the <em>tap</em>.");
        expect(response5.body.data[1].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure <em>stagnant</em> water is effectively treated");

        requestBody = {
            keyword: "treat effective", // comparison should include the words 'treat' and 'effective' in any order and with different conjugations
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response6 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response6.statusCode).toBe(200);
        expect(response6.body.count).toBe(1);
        expect(response6.body.data[0].idea).toBe("Zero: Tap monitors should ensure stagnant water is <em>effectively</em> <em>treated</em>");

        requestBody = {
            keyword: "monitors water tap", // comparison should include the words 'tap' and 'monitors' and 'water' in any order or conjugation
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response7 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response7.statusCode).toBe(200);
        expect(response7.body.count).toBe(3);
        expect(response7.body.data[0].idea).toBe("Three: <em>Monitor</em> users to ensure <em>water</em> points at the <em>tap</em> are kept clean.");
        expect(response7.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean <em>water</em>.");
        expect(response7.body.data[2].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant <em>water</em> is effectively treated");
    });

    test("keyword filter (tag search)", async () => {
        let requestBody = {
            keyword: "#homework",
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(1);
        expect(response1.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");

        requestBody = {
            keyword: "#nohomework",
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(1);
        expect(response2.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");

        requestBody = {
            keyword: "#homework #nohomework",
        };

        const response3 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response3.statusCode).toBe(200);
        expect(response3.body.count).toBe(2);
        expect(response3.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response3.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("keyword filter (null filter search", async () => {
        let requestBody = {
            keyword: "#null #homework",
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);

        requestBody = {
            keyword: "#null",
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(2);
        expect(response1.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response1.body.data[1].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");

        requestBody = {
            keyword: "#null immunization",
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(1);
        expect(response2.body.data[0].idea).toBe("Four: Give mothers warning of <em>immunization</em> days because they sometimes have to travel far to reach the clinics.");
    });

    test("keyword filter (textsearch)", async () => {
        let requestBody = {
            keyword: "textsearch:(tap | monitors)",
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(3);
        expect(response1.body.data[0].idea).toBe("Three: <em>Monitor</em> users to ensure water points at the <em>tap</em> are kept clean.");
        expect(response1.body.data[1].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to chlorinate stagnant H2O at the <em>tap</em>.");
        expect(response1.body.data[2].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean water.");

        requestBody = {
            keyword: "textsearch:(tap | monitors) & chlorinate",
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(1);
        expect(response2.body.data[0].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to <em>chlorinate</em> stagnant H2O at the <em>tap</em>.");
    });

    test("keyword filter (combined full-text and tag search)", async () => {
        const requestBody = {
            keyword: "#nohomework chlorine",
        };

        const response = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to <em>chlorinate</em> stagnant H2O at the tap.");
    });

    test("pagination", async () => {
        let requestBody = {
            limit: 1,
            page: 1,
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(4);
        expect(response1.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");

        requestBody = {
            limit: 1,
            page: 2,
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(4);
        expect(response2.body.data[0].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
    });
});

describe("POST /api/v3/responses/ideas (additional idea tokenisation tests)", () => {
    beforeEach(async () => {
        // create some responses with ideas in Swahili
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "hili ndilo wazo langu kutoka afrika mashariki ni kwamba tunahitaji maji",
                idea_language: "sw",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "maji ambayo tunapata katika nyumba zetu si safi",
                idea_language: "sw",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "mvua amabayo tunaipokea afrika mashariki ni mingi sana na ishaanza kufurika kwa manyumba zetu",
                idea_language: "sw",
            },
        ]);
    });

    test("keyword filter with/and tokenisation based on 'pg_catalog.simple'", async () => {
        /*
            For ideas where the language (idea_language) is not supported by PostgreSQL by default
            Also see set_responses_idea_tsvector function in PostgreSQL
         */
        const tomorrow = moment.utc().startOf("day").add(1, "days");

        let requestBody = {
            keyword: "maji", // comparison should include the Swahili word "maji"
            end: tomorrow.format("YYYY-MM-DD"),
        };

        const response1 = await request(app).post("/api/v3/responses/ideas")
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(2);
        expect(response1.body.data[0].idea).toBe(
            "hili ndilo wazo langu kutoka afrika mashariki ni kwamba tunahitaji <em>maji</em>",
        );
        expect(response1.body.data[1].idea).toBe("<em>maji</em> ambayo tunapata katika nyumba zetu si safi");

        requestBody = {
            keyword: "afrika mashariki", // comparison should include the Swahili words 'afrika' and 'mashariki' in any order
            end: tomorrow.format("YYYY-MM-DD"),
        };

        const response2 = await request(app).post("/api/v3/responses/ideas")
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(2);
        expect(response2.body.data[0].idea).toBe(
            "hili ndilo wazo langu kutoka <em>afrika</em> <em>mashariki</em> ni kwamba tunahitaji maji",
        );
        expect(response2.body.data[1].idea).toBe(
            "mvua amabayo tunaipokea <em>afrika</em> <em>mashariki</em> ni mingi sana na ishaanza kufurika kwa manyumba zetu",
        );

        // check that the tokens are as expected (ie: unchanged from the original text, as no word normalisation should
        // take place with the pg_catalog.simple dictionary)
        const responses = await knex("responses").select();
        expect(responses.length).toBe(3);
        expect(responses[0].idea_token_vector).toBe(
            "'afrika':6 'hili':1 'kutoka':5 'kwamba':9 'langu':4 'maji':11 'mashariki':7 'ndilo':2 'ni':8 'tunahitaji':10 'wazo':3",
        );
        expect(responses[1].idea_token_vector).toBe(
            "'ambayo':2 'katika':4 'maji':1 'nyumba':5 'safi':8 'si':7 'tunapata':3 'zetu':6",
        );
        expect(responses[2].idea_token_vector).toBe(
            "'afrika':4 'amabayo':2 'ishaanza':10 'kufurika':11 'kwa':12 'manyumba':13 'mashariki':5 'mingi':7 'mvua':1 'na':9 'ni':6 'sana':8 'tunaipokea':3 'zetu':14",
        );
    });
});

describe("POST /api/v3/responses/admin/my_data", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later

        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format();
        const fourDaysAgoFormatted = todayMidday.clone().subtract(4, "days").format();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
        const twoDaysAgoFormatted = todayMidday.clone().subtract(2, "days").format();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();

        // create some responses with various combinations of properties
        await knex("responses").insert([
            // this first response should be excluded by the default start-to-end time range that the endpoint uses if
            // no start and end are passed in
            {
                // id: 1,
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
                created_at: eightDaysAgoFormatted,
                uploaded_at: eightDaysAgoFormatted,
                updated_at: eightDaysAgoFormatted,
            },
            {
                // id: 2,
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
                created_at: fourDaysAgoFormatted,
                uploaded_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted,
                user_id: testData.surveyUser.id,
                satisfied: true,
                is_starred: true,
            },
            {
                // id: 3,
                service_point_id: 2, // "Reception Center", Protection, Nakivale Base Camp, Uganda
                idea: "Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.",
                created_at: threeDaysAgoFormatted,
                updated_at: threeDaysAgoFormatted,
                uploaded_at: threeDaysAgoFormatted,
                user_id: testData.surveyUser.id,
                satisfied: false,
            },
            {
                // id: 4,
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                created_at: twoDaysAgoFormatted,
                idea: "Three: Monitor users to ensure water points at the tap are kept clean.",
                updated_at: twoDaysAgoFormatted,
                uploaded_at: twoDaysAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: true,
            },
            {
                // id: 5,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: false,
            },
            {
                // id: 6,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: false,
            },
            {
                // id: 7,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: false,
            },
            {
                // id: 8,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: true,
            },
            {
                // id: 9,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: true,
            },
            {
                // id: 10,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                idea: "Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                response_type: "binary",
                satisfied: true,
            },
            {
                // id: 11,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: eightDaysAgoFormatted,
                idea: "Ten: Support with materials to assist with renovation of our houses.",
                updated_at: eightDaysAgoFormatted,
                uploaded_at: eightDaysAgoFormatted,
                user_id: testData.adminUser.id,
                satisfied: false,
            },
            {
                // id: 12,
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                created_at: oneDayAgoFormatted,
                idea: "Eleven: Provide stationery and books for children.",
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                user_id: testData.adminUser.id,
                satisfied: false,
            },
        ]);

        await knex("tags").insert([
            {
                response_id: 2,
                name: "education",
            },
            {
                response_id: 3,
                name: "homework",
            },
            {
                response_id: 4,
                name: "nohomework",
            },
            {
                response_id: 4,
                name: "testtag",
            },
            {
                response_id: 5,
                name: "structure",
            },
            {
                response_id: 6,
                name: "building",
            },
            {
                response_id: 6,
                name: "structure",
            },
            {
                response_id: 7,
                name: "building",
            },
            {
                response_id: 7,
                name: "structure",
            },
            {
                response_id: 8,
                name: "building",
            },
            {
                response_id: 8,
                name: "structure",
            },
            {
                response_id: 9,
                name: "structure",
            },
            {
                response_id: 10,
                name: "building",
            },
            {
                response_id: 10,
                name: "structure",
            },
            {
                response_id: 10,
                name: "housing",
            },
            {
                response_id: 11,
                name: "housing",
            },
            {
                response_id: 11,
                name: "structure",
            },
        ]);
    });

    test("happy path", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");

        const expectedStartDateFormatted = todayMidday.clone().hours(0).subtract(7, "days").format();
        const expectedEndDateFormatted = todayMidday.clone().hours(0).format();

        // using toISOString() instead of format() here because that is how the values are serialized when they come
        // from the DB (toISOString() includes milliseconds while format() does not)
        const fourDaysAgoFormatted = todayMidday.clone().subtract(4, "days").toISOString();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").toISOString();
        const twoDaysAgoFormatted = todayMidday.clone().subtract(2, "days").toISOString();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").toISOString();

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe(expectedStartDateFormatted);
        expect(response.body.dates.end).toBe(expectedEndDateFormatted);
        expect(response.body.count).toBe(10);

        expect(response.body.data[0].satisfied).toBe(false);
        expect(response.body.data[0].is_starred).toBe(false);
        expect(response.body.data[0].service_type).toBe("Water");
        expect(response.body.data[0].location).toBe("Nakivale Base Camp");
        expect(response.body.data[0].service_point).toBe("Talking Stick");
        expect(response.body.data[0].user).toBe(testData.adminUser.email);
        expect(response.body.data[0].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[0].idea).toBe("Eleven: Provide stationery and books for children.");
        expect(response.body.data[0].idea_language).toBe("en");
        expect(response.body.data[0].tags).toBe("");

        expect(response.body.data[1].satisfied).toBe(true);
        expect(response.body.data[1].is_starred).toBe(false);
        expect(response.body.data[1].service_type).toBe("Nutrition");
        expect(response.body.data[1].location).toBe("Mahama Camp");
        expect(response.body.data[1].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[1].user).toBe(testData.adminUser.email);
        expect(response.body.data[1].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[1].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[1].idea_language).toBe("en");
        expect(response.body.data[1].tags).toBe("building,housing,structure");

        expect(response.body.data[2].satisfied).toBe(true);
        expect(response.body.data[2].is_starred).toBe(false);
        expect(response.body.data[2].service_type).toBe("Nutrition");
        expect(response.body.data[2].location).toBe("Mahama Camp");
        expect(response.body.data[2].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[2].user).toBe(testData.adminUser.email);
        expect(response.body.data[2].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[2].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[2].idea_language).toBe("en");
        expect(response.body.data[2].tags).toBe("structure");

        expect(response.body.data[3].satisfied).toBe(true);
        expect(response.body.data[3].is_starred).toBe(false);
        expect(response.body.data[3].service_type).toBe("Nutrition");
        expect(response.body.data[3].location).toBe("Mahama Camp");
        expect(response.body.data[3].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[3].user).toBe(testData.adminUser.email);
        expect(response.body.data[3].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[3].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[3].idea_language).toBe("en");
        expect(response.body.data[3].tags).toBe("building,structure");

        expect(response.body.data[4].satisfied).toBe(false);
        expect(response.body.data[4].is_starred).toBe(false);
        expect(response.body.data[4].service_type).toBe("Nutrition");
        expect(response.body.data[4].location).toBe("Mahama Camp");
        expect(response.body.data[4].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[4].user).toBe(testData.adminUser.email);
        expect(response.body.data[4].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[4].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response.body.data[4].idea_language).toBe("en");
        expect(response.body.data[4].tags).toBe("building,structure");

        expect(response.body.data[5].satisfied).toBe(false);
        expect(response.body.data[5].is_starred).toBe(false);
        expect(response.body.data[5].service_type).toBe("Nutrition");
        expect(response.body.data[5].location).toBe("Mahama Camp");
        expect(response.body.data[5].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[5].user).toBe(testData.adminUser.email);
        expect(response.body.data[5].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[5].idea).toBe("Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.");
        expect(response.body.data[5].idea_language).toBe("en");
        expect(response.body.data[5].tags).toBe("building,structure");

        expect(response.body.data[6].satisfied).toBe(false);
        expect(response.body.data[6].is_starred).toBe(false);
        expect(response.body.data[6].service_type).toBe("Nutrition");
        expect(response.body.data[6].location).toBe("Mahama Camp");
        expect(response.body.data[6].service_point).toBe("Door to Door - Nutrition - Mahama");
        expect(response.body.data[6].user).toBe(testData.adminUser.email);
        expect(response.body.data[6].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[6].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[6].idea_language).toBe("en");
        expect(response.body.data[6].tags).toBe("structure");

        expect(response.body.data[7].satisfied).toBe(true);
        expect(response.body.data[7].is_starred).toBe(false);
        expect(response.body.data[7].service_type).toBe("Healthcare");
        expect(response.body.data[7].location).toBe("Mahama Camp");
        expect(response.body.data[7].service_point).toBe("OPD - Mahama 1 Health Center");
        expect(response.body.data[7].user).toBe(testData.adminUser.email);
        expect(response.body.data[7].created_at).toBe(twoDaysAgoFormatted);
        expect(response.body.data[7].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
        expect(response.body.data[7].idea_language).toBe("en");
        expect(response.body.data[7].tags).toBe("nohomework,testtag");

        expect(response.body.data[8].satisfied).toBe(false);
        expect(response.body.data[8].is_starred).toBe(false);
        expect(response.body.data[8].service_type).toBe("Protection");
        expect(response.body.data[8].location).toBe("Nakivale Base Camp");
        expect(response.body.data[8].service_point).toBe("Reception Center");
        expect(response.body.data[8].user).toBe(testData.surveyUser.email);
        expect(response.body.data[8].created_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[8].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[8].idea_language).toBe("en");
        expect(response.body.data[8].tags).toBe("homework");

        expect(response.body.data[9].satisfied).toBe(true);
        expect(response.body.data[9].is_starred).toBe(true);
        expect(response.body.data[9].service_type).toBe("Water");
        expect(response.body.data[9].location).toBe("Nakivale Base Camp");
        expect(response.body.data[9].service_point).toBe("Talking Stick");
        expect(response.body.data[9].user).toBe(testData.surveyUser.email);
        expect(response.body.data[9].created_at).toBe(fourDaysAgoFormatted);
        expect(response.body.data[9].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
        expect(response.body.data[9].idea_language).toBe("en");
        expect(response.body.data[9].tags).toBe("education");
    });

    test("service provider user results in 200", async () => {
        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test("invalid start date results in 400", async () => {
        const requestBody = {
            start: "21 Nov 2018",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("invalid end date results in 400", async () => {
        const requestBody = {
            end: "21-11-2018",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("invalid uploaded_at_start_date results in 400", async () => {
        const requestBody = {
            uploaded_at_start_date: "21 Nov 2018",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("invalid uploaded_at_end_date results in 400", async () => {
        const requestBody = {
            uploaded_at_start_date: "2019-09-03",
            uploaded_at_end_date: "21-11-2018",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Bad request");
    });

    test("start date and end date get swapped if start > end", async () => {
        const requestBody = {
            start: "2018-11-03",
            end: "2018-11-01",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe("2018-11-01T00:00:00Z");
        expect(response.body.dates.end).toBe("2018-11-03T00:00:00Z");
        expect(response.body.count).toBe(0);
    });

    test("uploaded_at_end_date and uploaded_at_start_date get swapped if uploaded_at_start_date > uploaded_at_end_date", async () => {
        const requestBody = {
            uploaded_at_start_date: "2018-11-03",
            uploaded_at_end_date: "2018-11-01",
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.uploaded_at_start_date).toBe("2018-11-01T00:00:00Z");
        expect(response.body.dates.uploaded_at_end_date).toBe("2018-11-03T00:00:00Z");
        expect(response.body.count).toBe(0);
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = [{
            contents: "shouldn't matter",
        }];

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe("Insufficient permissions");
    });

    test("created at date filter", async () => {
        const now = moment.utc().startOf("day");
        const eightDaysAgo = now.clone().subtract(8, "days");
        const twoDaysAgo = now.clone().subtract(2, "days");

        const requestBody = {
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: twoDaysAgo.format("YYYY-MM-DD"),
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start).toBe(eightDaysAgo.format());
        expect(response.body.dates.end).toBe(twoDaysAgo.format());
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].idea).toBe("Ten: Support with materials to assist with renovation of our houses.");
        expect(response.body.data[1].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[2].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
        expect(response.body.data[3].idea).toBe("Zero: Tap monitors should ensure stagnant water is effectively treated");
    });

    test("uploaded at date filter", async () => {
        const now = moment.utc().startOf("day");
        const sixDaysAgo = now.clone().subtract(6, "days");
        const twoDaysAgo = now.clone().subtract(2, "days");

        const requestBody = {
            uploaded_at_start_date: sixDaysAgo.format("YYYY-MM-DD"),
            uploaded_at_end_date: twoDaysAgo.format("YYYY-MM-DD"),
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.uploaded_at_start_date).toBe(sixDaysAgo.format());
        expect(response.body.dates.uploaded_at_end_date).toBe(twoDaysAgo.format());
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("country filter", async () => {
        const requestBody = {
            countries: [1], // Uganda
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        expect(response.body.data[0].idea).toBe("Eleven: Provide stationery and books for children.");
        expect(response.body.data[1].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[2].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("location filter", async () => {
        const requestBody = {
            settlements: [2], // Mahama Camp
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(7);
        expect(response.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[1].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[2].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[3].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response.body.data[4].idea).toBe("Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.");
        expect(response.body.data[5].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[6].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
    });

    test("service point filter", async () => {
        const requestBody = {
            points: [1], // "Talking Stick", Water, Nakivale Base Camp, Uganda
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Eleven: Provide stationery and books for children.");
        expect(response.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("service type filter", async () => {
        const requestBody = {
            types: [4], // Nutrition
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(6);
        expect(response.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[1].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[2].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[3].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response.body.data[4].idea).toBe("Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.");
        expect(response.body.data[5].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
    });

    test("keyword filter (full-text search)", async () => {
        const today = moment.utc().startOf("day");
        const eightDaysAgo = today.clone().subtract(8, "days");

        let requestBody = {
            keyword: "three", // comparison should be case-insensitive,
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response1 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(1);
        expect(response1.body.data[0].idea).toBe("<em>Three</em>: Monitor users to ensure water points at the tap are kept clean.");

        requestBody = {
            keyword: "WATER", // comparison should be case-insensitive
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response2 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(3);
        expect(response2.body.data[0].idea).toBe("Three: Monitor users to ensure <em>water</em> points at the tap are kept clean.");
        expect(response2.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean <em>water</em>.");
        expect(response2.body.data[2].idea).toBe("Zero: Tap monitors should ensure stagnant <em>water</em> is effectively treated");

        requestBody = {
            keyword: "Tap monitors", // comparison should include the words 'tap' and 'monitors' in any order and with different conjugations
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response3 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response3.statusCode).toBe(200);
        expect(response3.body.count).toBe(4);
        expect(response3.body.data[0].idea).toBe("Three: <em>Monitor</em> users to ensure water points at the <em>tap</em> are kept clean.");
        expect(response3.body.data[1].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to chlorinate stagnant H2O at the <em>tap</em>.");
        expect(response3.body.data[2].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean water.");
        expect(response3.body.data[3].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant water is effectively treated");

        requestBody = {
            keyword: 'water "Tap Monitors"', // comparison should include the words 'tap' and 'monitors' TOGETHER and 'water' before or after
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response4 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response4.statusCode).toBe(200);
        expect(response4.body.count).toBe(2);
        expect(response4.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean <em>water</em>.");
        expect(response4.body.data[1].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant <em>water</em> is effectively treated");

        requestBody = {
            keyword: '"Tap monitors" stagnant', // comparison should include the words 'tap' and 'monitors' TOGETHER and 'stagnant' before or after
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response5 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response5.statusCode).toBe(200);
        expect(response5.body.count).toBe(2);
        expect(response5.body.data[0].idea).toBe("Two: Please could <em>tap</em> <em>monitors</em> co-ordinate and meet regularly to chlorinate <em>stagnant</em> H2O at the <em>tap</em>.");
        expect(response5.body.data[1].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure <em>stagnant</em> water is effectively treated");

        requestBody = {
            keyword: "treat effective", // comparison should include the words 'treat' and 'effective' in any order and with different conjugations
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response6 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response6.statusCode).toBe(200);
        expect(response6.body.count).toBe(1);
        expect(response6.body.data[0].idea).toBe("Zero: Tap monitors should ensure stagnant water is <em>effectively</em> <em>treated</em>");

        requestBody = {
            keyword: "monitors water tap", // comparison should include the words 'tap' and 'monitors' and 'water' in any order or conjugation
            start: eightDaysAgo.format("YYYY-MM-DD"),
            end: today.format("YYYY-MM-DD"),
        };

        const response7 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response7.statusCode).toBe(200);
        expect(response7.body.count).toBe(3);
        expect(response7.body.data[0].idea).toBe("Three: <em>Monitor</em> users to ensure <em>water</em> points at the <em>tap</em> are kept clean.");
        expect(response7.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the <em>tap</em> <em>monitors</em> to ensure clean <em>water</em>.");
        expect(response7.body.data[2].idea).toBe("Zero: <em>Tap</em> <em>monitors</em> should ensure stagnant <em>water</em> is effectively treated");
    });

    test("keyword filter (tag search)", async () => {
        let requestBody = {
            keyword: "#homework",
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(1);
        expect(response1.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");

        requestBody = {
            keyword: "#nohomework",
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(1);
        expect(response2.body.data[0].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");

        requestBody = {
            keyword: "#homework #nohomework", // comparison should include the hash-tag #homework OR #nohomework
        };

        const response3 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response3.statusCode).toBe(200);
        expect(response3.body.count).toBe(2);
        expect(response3.body.data[0].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
        expect(response3.body.data[1].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");

        requestBody = {
            keyword: "#structuRE #homework", // comparison should include the hash-tag #structure OR #homework (case insensitive)
        };

        const response4 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response4.statusCode).toBe(200);
        expect(response4.body.count).toBe(7);
        expect(response4.body.data[0].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response4.body.data[6].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");

        requestBody = {
            keyword: "#structuRE #BUilding", // comparison should include the hash-tag #structure OR #building (case insensitive)
        };

        const response5 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response5.statusCode).toBe(200);
        expect(response5.body.count).toBe(6);
        expect(response5.body.data[0].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response5.body.data[5].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");

        requestBody = {
            keyword: "#education #structURE #BUILding #homework #nohomewoRK", // comparison should include the hash-tag #education OR #structure OR #building OR #homework OR #nohomework (case insensitive)
        };

        const response6 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response6.statusCode).toBe(200);
        expect(response6.body.count).toBe(9);
        expect(response6.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response6.body.data[8].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("keyword filter (combined full-text and tag search)", async () => {
        let requestBody = {
            keyword: "#homework chlorine",
        };

        const response1 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(1);
        expect(response1.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to <em>chlorinate</em> stagnant H2O at the tap.");

        requestBody = {
            keyword: '"Tap monitors" stagnant #structure', // comparison should include the words 'tap' & 'monitors' TOGETHER and 'stagnant' before or after, AND the hash-tag #structure
        };

        const response2 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(0);

        requestBody = {
            keyword: "renovate #structure #building", // comparison should include the word 'renovate' in any conjugation, AND (the hash-tag #structure OR #building)
        };

        const response3 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response3.statusCode).toBe(200);
        expect(response3.body.count).toBe(5);
        expect(response3.body.data[0].idea).toBe("Five: Tell community leaders to stop asking money from the people who are <em>renovating</em> their houses because we budget the money to buy materials.");
        expect(response3.body.data[4].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be <em>renovated</em>.");

        requestBody = {
            keyword: "plastic #education #structURE #BUILding #homework #nohomework", // comparison should include the word 'plastic' in any conjugation AND (the hash-tag #education OR #structure OR #building OR #homework OR #nohomework [case insensitive])
        };

        const response4 = await request(app).post("/api/v3/responses/ideas").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response4.statusCode).toBe(200);
        expect(response4.body.count).toBe(2);
        expect(response4.body.data[0].idea).toBe("Eight: Let people construct houses with <em>plastic</em> sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response4.body.data[1].idea).toBe("Nine: New <em>plastic</em> sheetings should be provided to mirambira people because all of their houses need to be renovated.");

        requestBody = {
            keyword: "#STRUCTURE #HOMEWORK regular", // comparison should include the word 'regular' in any conjugation AND (the hash-tag #structure OR #homework)
        };

        const response5 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response5.statusCode).toBe(200);
        expect(response5.body.count).toBe(1);
        expect(response5.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet <em>regularly</em> to chlorinate stagnant H2O at the tap.");

        requestBody = {
            keyword: "#structure regular", // comparison should include the word 'regular' in any conjugation AND the hash-tag #structure
        };

        const response6 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response6.statusCode).toBe(200);
        expect(response6.body.count).toBe(0);

        requestBody = {
            keyword: "#null #homework",
        };

        const response7 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response7.statusCode).toBe(200);
        expect(response7.body.count).toBe(0);
    });

    test("user filter", async () => {
        const requestBody = {
            users: [testData.surveyUser.id],
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[1].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("user locations filter", async () => {
        const requestBody = {
            user_locations: ["2"],
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].user_location).toBe("Mahama Camp");
        expect(response.body.data[1].user_location).toBe("Mahama Camp");
    });

    test("response type filter", async () => {
        const requestBody = {
            response_types: ["binary"],
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(7);
        expect(response.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[1].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[2].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[3].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response.body.data[4].idea).toBe("Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.");
        expect(response.body.data[5].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[6].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
    });

    test("satisfied filter", async () => {
        const requestBody = {
            satisfied: [true],
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(5);
        expect(response.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[1].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[2].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[3].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
        expect(response.body.data[4].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("is starred filter", async () => {
        const requestBody = {
            is_starred: [true],
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
    });

    test("pagination", async () => {
        let requestBody = {
            limit: 1,
            page: 1,
        };

        const response1 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);
        expect(response1.body.count).toBe(10);
        expect(response1.body.data[0].idea).toBe("Eleven: Provide stationery and books for children.");

        requestBody = {
            limit: 1,
            page: 2,
        };

        const response2 = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.count).toBe(10);
        expect(response2.body.data[0].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
    });

    test("sorting", async () => {
        const requestBody = {
            sort: {
                by: "created_at",
                order: "asc",
            },
        };

        const response = await request(app).post("/api/v3/responses/admin/my_data").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(10);
        expect(response.body.data[0].idea).toBe("One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.");
        expect(response.body.data[1].idea).toBe("Two: Please could tap monitors co-ordinate and meet regularly to chlorinate stagnant H2O at the tap.");
        expect(response.body.data[2].idea).toBe("Three: Monitor users to ensure water points at the tap are kept clean.");
        expect(response.body.data[3].idea).toBe("Four: Give mothers warning of immunization days because they sometimes have to travel far to reach the clinics.");
        expect(response.body.data[4].idea).toBe("Five: Tell community leaders to stop asking money from the people who are renovating their houses because we budget the money to buy materials.");
        expect(response.body.data[5].idea).toBe("Six: Renovate the houses for PSNs in kiretwa A because roofs were taken by wind and we don't have money to pay builders.");
        expect(response.body.data[6].idea).toBe("Seven: Support us with pesticides to spray termites that destroy our poles used to construct houses because we don't have money for renovation.");
        expect(response.body.data[7].idea).toBe("Eight: Let people construct houses with plastic sheets and burnt bricks because local bricks we use, Cement peels off easily hence pushing us to keep on renovating.");
        expect(response.body.data[8].idea).toBe("Nine: New plastic sheetings should be provided to mirambira people because all of their houses need to be renovated.");
        expect(response.body.data[9].idea).toBe("Eleven: Provide stationery and books for children.");
    });
});

describe('GET /api/v3/responses/count', () => {

    beforeEach(async () => {
        let todayMidday = moment.utc().hours(12).startOf('hour'); // fix the time for easier assertions later

        // create some responses
        await knex('responses').insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: todayMidday.format(),
                updated_at: todayMidday.format(),
                satisfied: true
            },
            {
                service_point_id: 2, // "Reception Center", Protection, Nakivale Base Camp, Uganda
                idea: "the second idea",
                created_at: todayMidday.format(),
                updated_at: todayMidday.format(),
                satisfied: false
            }
        ]);
    });

    test('happy path', async () => {
        const response = await request(app).get('/api/v3/responses/count').set('Authorization', `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body).toEqual(expect.arrayContaining(
            [
                {
                    satisfied: false,
                    cnt: "1"
                },
                {
                    satisfied: true,
                    cnt: "1"
                }
            ]
        ));
    });

    test('service provider user results in 200', async () => {
        const response = await request(app).get('/api/v3/responses/count').set('Authorization', `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test('non-privileged user results in 401', async () => {
        const response = await request(app).get('/api/v3/responses/count').set('Authorization', `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe('Insufficient permissions');
    });

});

describe('GET /api/v3/responses/:id', () => {

    beforeEach(async () => {
        let todayMidday = moment.utc().hours(12).startOf('hour'); // fix the time for easier assertions later

        // create a response
        await knex('responses').insert(
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: todayMidday.format(),
                updated_at: todayMidday.format(),
                uploaded_at: todayMidday.format(),
                satisfied: true,
                lat: testData.defaultServicePoint.lat,
                lng: testData.defaultServicePoint.lng,
                user_id: testData.surveyUser.id
            }
        );
    });

    test('happy path', async () => {
        let todayMidday = moment.utc().hours(12).startOf('hour');

        // using toISOString() instead of format() here because that is how the values are serialized when they come from the DB
        // (toISOString() includes milliseconds while format() does not)
        let todayMiddayFormatted = todayMidday.toISOString();

        const response = await request(app).get('/api/v3/responses/1').set('Authorization', `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject(
            {
                data: [
                    {
                        id: "1",
                        idea: "the first idea",
                        country: "Uganda",
                        location: "Nakivale Base Camp",
                        service_point: "Talking Stick",
                        service_type: "Water",
                        satisfied: true,
                        response_type: "",
                        created_at: todayMiddayFormatted,
                        updated_at: todayMiddayFormatted,
                        uploaded_at: todayMiddayFormatted,
                        is_starred: false,
                        lat: testData.defaultServicePoint.lat.toString(),
                        lng: testData.defaultServicePoint.lng.toString(),
                        email: testData.surveyUser.email
                    }
                ]
            }
        );
    });

    test('service provider user results in 200', async () => {
        const response = await request(app).get('/api/v3/responses/1').set('Authorization', `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test('invalid id results in 400', async () => {
        const response = await request(app).get('/api/v3/responses/invalidId').set('Authorization', `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Bad request');
    });

    test('non-privileged user results in 401', async () => {
        const response = await request(app).get('/api/v3/responses/1').set('Authorization', `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe('Insufficient permissions');
    });

    test('non-existent id results in empty response', async () => {
        const response = await request(app).get('/api/v3/responses/99999').set('Authorization', `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject(
            {
                data: []
            }
        );
    });
});

describe("PATCH /api/v3/responses/admin/update", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const todayAfternoon = moment.utc().hours(15).startOf("hour");
        const yesterdayMidday = todayMidday.clone().subtract(1, "day");

        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: yesterdayMidday.format(),
                updated_at: yesterdayMidday.format(),
                uploaded_at: yesterdayMidday.format(),
                satisfied: true,
                is_starred: true,
                idea_language: "en",
            },
            {
                service_point_id: 2, // "Reception Center", Protection, Nakivale Base Camp, Uganda
                idea: "the second idea",
                created_at: todayMidday.format(),
                updated_at: todayMidday.format(),
                uploaded_at: todayMidday.format(),
                satisfied: false,
                idea_language: "en",
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                created_at: todayAfternoon.format(),
                updated_at: todayAfternoon.format(),
                uploaded_at: todayAfternoon.format(),
                satisfied: true,
                idea_language: "es",
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                created_at: todayMidday.format(),
                updated_at: todayMidday.format(),
                uploaded_at: todayMidday.format(),
                satisfied: true,
                idea_language: "es",
            },
            {
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: yesterdayMidday.format(),
                updated_at: todayMidday.format(),
                uploaded_at: todayMidday.format(),
                satisfied: true,
                idea_language: "en",
            },
            {
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: yesterdayMidday.format(),
                updated_at: todayAfternoon.format(),
                uploaded_at: todayAfternoon.format(),
                satisfied: true,
                idea_language: "es",
            },
        ]);
    });

    test("unauthorized patch", async () => {
        const requestBody = {
            response_ids: [3, 4],
            action: "change_service_point",
            new_service_point_id: 4,
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Insufficient permissions",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(expectedResponse);

        const response2 = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(401);
        expect(response2.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to missing response_ids in params", async () => {
        const requestBody = {
            action: "change_service_point",
            new_service_point_id: 4,
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Missing 'action' and/or 'response_ids' parameters",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to empty response_ids in params", async () => {
        const requestBody = {
            response_ids: [],
            action: "change_service_point",
            new_service_point_id: 4,
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Missing 'action' and/or 'response_ids' parameters",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to missing action in params", async () => {
        const requestBody = {
            response_ids: [3, 4],
            new_service_point_id: 4,
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Missing 'action' and/or 'response_ids' parameters",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to invalid action in params", async () => {
        const requestBody = {
            response_ids: [3, 4],
            action: "some_random_action",
            new_idea_lang: "en",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Invalid value provided for 'action' parameter",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to missing new_service_point_id in params", async () => {
        const requestBody = {
            response_ids: [3, 4],
            action: "change_service_point",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Missing 'new_service_point_id' parameter",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to difference in existing service point ids", async () => {
        const requestBody = {
            response_ids: [2, 3],
            action: "change_service_point",
            new_service_point_id: 4,
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Selected responses must all have the same 'service_point_id'",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("successful service point patch", async () => {
        const requestBody = {
            response_ids: [3, 4],
            action: "change_service_point",
            new_service_point_id: 4,
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.state).toEqual("updated");
        expect(response.body.ids.length).toEqual(2);
    });

    test("unsuccessful patch due to difference in created at dates", async () => {
        const requestBody = {
            response_ids: [1, 2],
            action: "reset_date_to_uploaded",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Selected responses must all have the same 'created_at' and 'uploaded_at' dates",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("unsuccessful patch due to difference in uploaded at dates", async () => {
        const requestBody = {
            response_ids: [1, 5],
            action: "reset_date_to_uploaded",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Selected responses must all have the same 'created_at' and 'uploaded_at' dates",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });

    test("successful patch even if created at times dont match but dates match", async () => {
        const requestBody = {
            response_ids: [2, 3, 4],
            action: "reset_date_to_uploaded",
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.state).toEqual("updated");
        expect(response.body.ids.length).toEqual(3);
    });

    test("successful created_at patch", async () => {
        const requestBody = {
            response_ids: [5, 6],
            action: "reset_date_to_uploaded",
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.state).toEqual("updated");
        expect(response.body.ids.length).toEqual(2);
    });
    test("unsuccessful patch due to missing new_idea_lang in params", async () => {
        const requestBody = {
            response_ids: [1, 5],
            action: "change_idea_language",
            new_idea_lang: "",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Missing 'new_idea_lang' parameter",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });
    test("unsuccessful patch due to difference in existing ideas", async () => {
        const requestBody = {
            response_ids: [2, 3],
            action: "change_idea_language",
            new_idea_lang: "es",
        };

        const expectedResponse = {
            error: {
                source: "Update responses",
                message: "Selected responses must all have the same 'idea_language'",
            },
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(expectedResponse);
    });
    test("successful idea language patch", async () => {
        const requestBody = {
            response_ids: [1, 2],
            action: "change_idea_language",
            new_idea_lang: "es",
        };

        const response = await request(app).patch("/api/v3/responses/admin/update")
            .set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.state).toEqual("updated");
        expect(response.body.ids.length).toEqual(2);
    });
});
