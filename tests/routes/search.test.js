const request = require("supertest");
const app = require("../../src/app");

describe("/api/v3/search/:pattern", () => {
    test("happy path --list", async () => {
        const response = await request(app).get("/api/v3/search/Rwa").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.countries[0].name).toBe("Rwanda");
        expect(response.body.countries[0].iso_two_letter_code).toBe("RW");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/search/Rwa");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/search/Rwa").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("incorrect pattern results to 400", async () => {
        const incorrectPattern = "$%@*";
        const response = await request(app).get(`/api/v3/search/${incorrectPattern}`).set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
    });
});
