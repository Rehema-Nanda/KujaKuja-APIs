const request = require("supertest");
const moment = require("moment");
const app = require("../../src/app");

describe("POST /api/v3/snapshots", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        await knex("responses").insert(
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                satisfied: true,
                lat: testData.defaultServicePoint.lat,
                lng: testData.defaultServicePoint.lng,
                user_id: testData.surveyUser.id,
            },
        );
    });

    test("happy path ", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const twoDayAgoFormatted = todayMidday.clone().subtract(2, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: twoDayAgoFormatted,
            end: todayMidday.format("YYYY-MM-DD"),
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].region).toBeTruthy();
        expect(response.body.data[0].interval).toBeTruthy();
        expect(response.body.data[0].previous).toBeTruthy();
        expect(response.body.data[0].next).toBeTruthy();
        expect(response.body.data[0].region.name).toBe("Nakivale Base Camp")
    });

    test("non-privileged user results in 401", async () => {
        const todayMidday = moment.utc().hours(8).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid start date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: "Invalid date",
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("invalid end date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: "Invalid date",
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });
});

describe("POST /api/v3/snapshots/service_types", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        await knex("responses").insert(
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                satisfied: true,
                lat: testData.defaultServicePoint.lat,
                lng: testData.defaultServicePoint.lng,
                user_id: testData.surveyUser.id,
            },
        );
    });

    test("happy path ", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const twoDayAgoFormatted = todayMidday.clone().subtract(2, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: twoDayAgoFormatted,
            end: todayMidday.format("YYYY-MM-DD"),
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_types").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.count).toBe(1);
        const settlementId = testData.defaultLocation.id;
        expect(response.body.data[settlementId][0].service_type_id).toBeTruthy();
        expect(response.body.data[settlementId][0].service_type_name).toBeTruthy();
        expect(response.body.data[settlementId][0].average).toBeTruthy();
        expect(response.body.data[settlementId][0].responses).toBeTruthy();
        expect(response.body.data[settlementId][0].service_type_name).toBe("Water");
    });

    test("non-privileged user results in 401", async () => {
        const todayMidday = moment.utc().hours(8).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_types").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid start date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: "Invalid date",
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_types").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("invalid end date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: "Invalid date",
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_types").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });
});

describe("POST /api/v3/snapshots/service_points", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, "days").format();
        await knex("responses").insert(
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "the first idea",
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted,
                uploaded_at: oneDayAgoFormatted,
                satisfied: true,
                lat: testData.defaultServicePoint.lat,
                lng: testData.defaultServicePoint.lng,
                user_id: testData.surveyUser.id,
            },
        );
    });

    test("happy path ", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const twoDayAgoFormatted = todayMidday.clone().subtract(2, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: twoDayAgoFormatted,
            end: todayMidday.format("YYYY-MM-DD"),
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.count).toBe(1);
        const settlementId = testData.defaultLocation.id;
        expect(response.body.data[settlementId][0].service_point_id).toBeTruthy();
        expect(response.body.data[settlementId][0].service_point_name).toBeTruthy();
        expect(response.body.data[settlementId][0].average).toBeTruthy();
        expect(response.body.data[settlementId][0].responses).toBeTruthy();
        expect(response.body.data[settlementId][0].satisfied).toBeTruthy();
        expect(response.body.data[settlementId][0].service_point_name).toBe("Talking Stick");
    });

    test("non-privileged user results in 401", async () => {
        const todayMidday = moment.utc().hours(8).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_points").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid start date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: "Invalid date",
            end: threeDaysAgoFormatted,
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("invalid end date results to 400", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: eightDaysAgoFormatted,
            end: "Invalid date",
            countries: [],
            settlements: [],
            service_types: [],
        };

        const response = await request(app).post("/api/v3/snapshots/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });
});
