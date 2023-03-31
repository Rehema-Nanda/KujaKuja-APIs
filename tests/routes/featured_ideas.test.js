"use strict";

const request = require("supertest");
const moment = require('moment');
const app = require('../../src/app');

describe("GET /api/v3/featured_ideas/last", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later

        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        const todayMiddayFormatted = todayMidday.format();

        // create some featured ideas
        await knex("featured_ideas").insert([
            // this first featured idea should be excluded by the default start-to-end time range that the endpoint uses
            {
                idea: "the old featured idea",
                created_at: eightDaysAgoFormatted,
                updated_at: eightDaysAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "the featured idea from three days ago",
                created_at: threeDaysAgoFormatted,
                updated_at: threeDaysAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "the recent featured idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "today's featured idea",
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        ]);
    });

    test("happy path", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");

        // using toISOString() instead of format() here because that is how the values are serialized when they come from the DB
        // (toISOString() includes milliseconds while format() does not)
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").toISOString();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").toISOString();
        const todayMiddayFormatted = todayMidday.toISOString();

        const response = await request(app).get("/api/v3/featured_ideas/last").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(3);

        expect(response.body[0].idea).toBe("today's featured idea");
        expect(response.body[0].created_at).toBe(todayMiddayFormatted);
        expect(response.body[0].updated_at).toBe(todayMiddayFormatted);
        expect(response.body[0].name).toBe(testData.defaultLocation.name);

        expect(response.body[1].idea).toBe("the recent featured idea");
        expect(response.body[1].created_at).toBe(oneDayAgoFormatted);
        expect(response.body[1].updated_at).toBe(oneDayAgoFormatted);
        expect(response.body[1].name).toBe(testData.defaultLocation.name);

        expect(response.body[2].idea).toBe("the featured idea from three days ago");
        expect(response.body[2].created_at).toBe(threeDaysAgoFormatted);
        expect(response.body[2].updated_at).toBe(threeDaysAgoFormatted);
        expect(response.body[2].name).toBe(testData.defaultLocation.name);
    });

    test("service provider user results in 200", async () => {
        const response = await request(app).get("/api/v3/featured_ideas/last").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/featured_ideas/last");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/featured_ideas/last").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("GET /api/v3/featured_ideas/:id?", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later

        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        const todayMiddayFormatted = todayMidday.format();

        // create some featured ideas
        await knex("featured_ideas").insert([
            {
                idea: "the featured idea from three days ago",
                created_at: threeDaysAgoFormatted,
                updated_at: threeDaysAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "the recent featured idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "today's featured idea",
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        ]);
    });

    test("happy path - list", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");

        // using toISOString() instead of format() here because that is how the values are serialized when they come from the DB
        // (toISOString() includes milliseconds while format() does not)
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").toISOString();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").toISOString();
        const todayMiddayFormatted = todayMidday.toISOString();

        const response = await request(app).get("/api/v3/featured_ideas/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);

        expect(response.body.data[2].idea).toBe("the featured idea from three days ago");
        expect(response.body.data[2].created_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[2].updated_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[2].settlement_id).toBe(testData.defaultLocation.id);

        expect(response.body.data[1].idea).toBe("the recent featured idea");
        expect(response.body.data[1].created_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[1].updated_at).toBe(oneDayAgoFormatted);
        expect(response.body.data[1].settlement_id).toBe(testData.defaultLocation.id);

        expect(response.body.data[0].idea).toBe("today's featured idea");
        expect(response.body.data[0].created_at).toBe(todayMiddayFormatted);
        expect(response.body.data[0].updated_at).toBe(todayMiddayFormatted);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultLocation.id);
    });

    test("happy path - fetch specific", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        // using toISOString() instead of format() here because that is how the values are serialized when they come from the DB
        // (toISOString() includes milliseconds while format() does not)
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").toISOString();

        const response = await request(app).get("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);

        expect(response.body.data[0].idea).toBe("the featured idea from three days ago");
        expect(response.body.data[0].created_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[0].updated_at).toBe(threeDaysAgoFormatted);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultLocation.id);
    });

    test("service provider user results in 200", async () => {
        const response = await request(app).get("/api/v3/featured_ideas/").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(200);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/featured_ideas/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("POST /api/v3/featured_ideas/paginator", () => {
    const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later
    const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
    const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
    const todayMiddayFormatted = todayMidday.format();

    beforeEach(async () => {
        // const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later

        // const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format();
        // const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        // const todayMiddayFormatted = todayMidday.format();

        // create some featured ideas
        await knex("featured_ideas").insert([
            {
                idea: "the featured idea from three days ago",
                created_at: threeDaysAgoFormatted,
                updated_at: threeDaysAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "the recent featured idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                settlement_id: testData.defaultLocation.id,
            },
            {
                idea: "today's featured idea",
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        ]);
    });

    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/featured_ideas/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[2].idea).toBe("the featured idea from three days ago");
        expect(response.body.data[2].settlement_id).toBe(testData.defaultLocation.id);

        expect(response.body.data[1].idea).toBe("the recent featured idea");
        expect(response.body.data[1].settlement_id).toBe(testData.defaultLocation.id);

        expect(response.body.data[0].idea).toBe("today's featured idea");
        expect(response.body.data[0].settlement_id).toBe(testData.defaultLocation.id);
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/featured_ideas/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/featured_ideas/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("pagination", async () => {
        let requestBody;
        let response;

        requestBody = {
            limit: 3,
            page: 1,
            sort: {
                by: "idea",
                order: "asc",
            },
        };

        response = await request(app).post("/api/v3/featured_ideas/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        expect(response.body.data[0].idea).toBe("the featured idea from three days ago");
        expect(response.body.data[0].settlement_name).toBe("Nakivale Base Camp");
    });
});

describe("POST /api/v3/featured_ideas", () => {
    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            idea: "a great idea that has been featured",
            settlement_id: testData.defaultLocation.id,
        };

        const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        const insertedFeaturedIdea = await knex("featured_ideas").where("id", response.body.id).first();
        // properties in the request body:
        expect(insertedFeaturedIdea.idea).toBe(requestBody.idea);
        expect(insertedFeaturedIdea.settlement_id).toBe(requestBody.settlement_id);
        // properties set by the endpoint:
        expect(now.diff(insertedFeaturedIdea.created_at, "seconds")).toBe(0);
        expect(now.diff(insertedFeaturedIdea.updated_at, "seconds")).toBe(0);
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };
        const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("service provider user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };
        const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {
        test("missing required field", async () => {
            const requestBody = {
                idea: "a great idea that has been featured",
            };

            const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.settlement_id is required");
        });

        test("incorrect type", async () => {
            const requestBody = {
                idea: 12345,
                settlement_id: testData.defaultLocation.id,
            };

            const response = await request(app).post("/api/v3/featured_ideas").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.idea");
            expect(response.body.error.message).toContain("is not of a type(s) string");
        });
    });
});

describe("PUT /api/v3/featured_ideas/:id", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later
        const todayMiddayFormatted = todayMidday.format();

        // create a featured idea
        await knex("featured_ideas").insert(
            {
                idea: "today's featured idea",
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        );
    });

    test("happy path", async () => {
        const now = moment();
        const todayMidday = moment.utc().hours(12).startOf("hour");

        const requestBody = {
            idea: "today's featured idea updated",
        };

        const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.state).toBe("updated");

        const updatedFeaturedIdea = await knex("featured_ideas").where("id", response.body.id).first();
        // properties in the request body:
        expect(updatedFeaturedIdea.idea).toBe(requestBody.idea);
        // properties set by the endpoint:
        expect(now.diff(updatedFeaturedIdea.updated_at, "seconds")).toBe(0);
        // properties that should be unchanged from the seeded featured idea:
        expect(updatedFeaturedIdea.created_at).toStrictEqual(todayMidday.toDate());
        expect(updatedFeaturedIdea.settlement_id).toEqual(testData.defaultLocation.id);
    });

    test("invalid id results in 400", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/featured_ideas/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const requestBody = {
            idea: "today's featured idea updated",
        };

        const response = await request(app).put("/api/v3/featured_ideas/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("service provider user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {
        test("idea & settlement_id not required", async () => {
            const now = moment();

            const requestBody = {
                updated_at: now.format(),
            };

            const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(200);
            expect(response.body.id).toBe(1);
            expect(response.body.state).toBe("updated");

            const updatedFeaturedIdea = await knex("featured_ideas").where("id", response.body.id).first();
            // NB: note that we are not checking against properties in the request body in this instance as the endpoint always overrides updated_at and there are no other
            // properties that we could use for this test
            // properties set by the endpoint:
            expect(now.diff(updatedFeaturedIdea.updated_at, "seconds")).toBe(0);
        });

        test("created_at not allowed", async () => {
            const now = moment();

            const requestBody = {
                idea: "today's featured idea updated",
                created_at: now.format(),
            };

            const response = await request(app).put("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.created_at");
            expect(response.body.error.message).toContain("is of prohibited type any");
        });
    });
});

describe("DELETE /api/v3/featured_ideas/:id", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later
        const todayMiddayFormatted = todayMidday.format();

        // create a featured idea
        await knex("featured_ideas").insert(
            {
                idea: "today's featured idea",
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        );
    });

    test("happy path", async () => {
        const response = await request(app).delete("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.state).toBe("deleted");

        const featuredIdeaCount = await knex("featured_ideas").count("*");
        expect(featuredIdeaCount[0].count).toBe("0");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).delete("/api/v3/featured_ideas/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const response = await request(app).delete("/api/v3/featured_ideas/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("deleted");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).delete("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("service provider user results in 401", async () => {
        const response = await request(app).delete("/api/v3/featured_ideas/1").set("Authorization", `Bearer ${testData.serviceProviderUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
