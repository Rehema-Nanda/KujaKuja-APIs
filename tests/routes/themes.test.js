const request = require("supertest");
const moment = require("moment");
const app = require("../../src/app");

describe("POST /api/v3/themes/", () => {
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

        const response = await request(app).post("/api/v3/themes/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("dates");
        expect(response.body).toHaveProperty("themes");
        expect(response.body.themes).toHaveProperty("name");
        expect(response.body.themes).toHaveProperty("children");
        expect(response.body.themes.name).toBe("Themes");
    });

    test("unauthenticated user results in 401", async () => {const todayMidday = moment.utc().hours(12).startOf("hour");
    const twoDayAgoFormatted = todayMidday.clone().subtract(2, "days").format("YYYY-MM-DD");
    const requestBody = {
        start: twoDayAgoFormatted,
        end: todayMidday.format("YYYY-MM-DD"),
        countries: [],
        settlements: [],
        service_types: [],
    };

    const response = await request(app).post("/api/v3/themes/").send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour");
        const twoDayAgoFormatted = todayMidday.clone().subtract(2, "days").format("YYYY-MM-DD");
        const requestBody = {
            start: twoDayAgoFormatted,
            end: todayMidday.format("YYYY-MM-DD"),
            countries: [],
            settlements: [],
            service_types: [],
        };
        const response = await request(app).post("/api/v3/themes/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
