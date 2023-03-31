const request = require("supertest");
const moment = require("moment");
const app = require("../../src/app");

describe("GET /api/v3/countries/:id?", () => {
    test("happy path - list", async () => {
        const response = await request(app).get("/api/v3/countries/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        // properties that should be unchanged from the seeded country:
        expect(response.body.data[0].enabled).toBe(testData.defaultCountry.enabled);
        expect(response.body.data[0].name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].iso_two_letter_code).toBe(testData.defaultCountry.iso_two_letter_code);
        expect(response.body.data[0].geojson).toBe(testData.defaultCountry.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultCountry.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultCountry.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultCountry.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultCountry.updated_at.toISOString());
    });

    test("happy path - enabled", async () => {
        // update Uganda to be disabled
        await knex("countries").where("name", "Uganda").update({ enabled: false });

        const response = await request(app).get("/api/v3/countries/enabled").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].name).toBe("Rwanda");
    });

    test("happy path - fetch specific", async () => {
        const response = await request(app).get(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        // properties that should be unchanged from the seeded country:
        expect(response.body.data[0].enabled).toBe(testData.defaultCountry.enabled);
        expect(response.body.data[0].name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].iso_two_letter_code).toBe(testData.defaultCountry.iso_two_letter_code);
        expect(response.body.data[0].geojson).toBe(testData.defaultCountry.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultCountry.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultCountry.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultCountry.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultCountry.updated_at.toISOString());
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/countries/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/countries/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/countries/invalidId").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in empty response", async () => {
        const response = await request(app).get("/api/v3/countries/99999").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);
    });
});

describe("POST /api/v3/countries/paginator", () => {
    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/countries/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[0].enabled).toBe(testData.defaultCountry.enabled);
        expect(response.body.data[0].name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].iso_two_letter_code).toBe(testData.defaultCountry.iso_two_letter_code);
        expect(response.body.data[0].geojson).toBe(testData.defaultCountry.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultCountry.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultCountry.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultCountry.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultCountry.updated_at.toISOString());
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/countries/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/countries/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
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
                by: "name",
                order: "desc",
            },
        };

        response = await request(app).post("/api/v3/countries/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].name).toBe("Uganda");

        requestBody = {
            limit: 3,
            page: 1,
            sort: {
                by: "enabled",
                order: "desc",
            },
        };

        response = await request(app).post("/api/v3/countries/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.data[0].name).toBe("Uganda");
    });
});

describe("POST /api/v3/countries", () => {
    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            name: "Fake Country",
            enabled: true,
            iso_two_letter_code: "FC",
            lat: -33.892032,
            lng: 18.505682,
        };

        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        const insertedCountry = await knex("countries").where("id", response.body.id).first();
        // properties in the request body:
        expect(insertedCountry.name).toBe(requestBody.name);
        expect(insertedCountry.enabled).toBe(requestBody.enabled);
        expect(insertedCountry.iso_two_letter_code).toBe(requestBody.iso_two_letter_code);
        expect(insertedCountry.lat).toBe(requestBody.lat.toFixed(8));
        expect(insertedCountry.lng).toBe(requestBody.lng.toFixed(8));
        // properties set by the endpoint:
        expect(now.diff(insertedCountry.created_at, "seconds")).toBe(0);
        expect(now.diff(insertedCountry.updated_at, "seconds")).toBe(0);
        // all other properties, except id:
        expect(insertedCountry.geojson).toBeNull();
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("duplicate two-letter iso code", async () => {
        const requestBody = {
            name: "Fake Country",
            enabled: true,
            iso_two_letter_code: "AB",
            lat: -35.895032,
            lng: 15.514682,
        };
        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        const requestBody2 = {
            name: "Fake Country 2",
            enabled: true,
            iso_two_letter_code: "AB",
            lat: -35.896032,
            lng: 15.515682,
        };
        const response2 = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody2);
        expect(response2.statusCode).toBe(500);
    });

    test("non-duplicate two-letter iso code", async () => {
        const requestBody = {
            name: "Fake Country",
            enabled: true,
            iso_two_letter_code: "FC",
            lat: -35.894032,
            lng: 15.511682,
        };
        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        const requestBody2 = {
            name: "Fake Country 2",
            enabled: true,
            iso_two_letter_code: "FD",
            lat: -35.896032,
            lng: 15.515682,
        };
        const response2 = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody2);
        expect(response2.statusCode).toBe(200);
    });

    describe("validation", () => {
        test("missing required field", async () => {
            const requestBody = {
                enabled: true,
                iso_two_letter_code: "FC",
                lat: -33.892032,
                lng: 18.505682,
            };

            const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.name");
            expect(response.body.error.message).toContain("is required");
        });

        test("incorrect type", async () => {
            const requestBody = {
                name: "Fake Country",
                enabled: "should be a boolean",
                iso_two_letter_code: "FC",
                lat: -33.892032,
                lng: 18.505682,
            };

            const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.enabled");
            expect(response.body.error.message).toContain("is not of a type(s) boolean");
        });
    });
});

describe("PUT /api/v3/countries/:id", () => {
    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(testData.defaultCountry.id, 10));
        expect(response.body.state).toBe("updated");

        const updatedCountry = await knex("countries").where("id", response.body.id).first();
        // properties in the request body:
        expect(updatedCountry.name).toBe(requestBody.name);
        // properties set by the endpoint:
        expect(now.diff(updatedCountry.updated_at, "seconds")).toBe(0);
        // properties that should be unchanged from the seeded country:
        expect(updatedCountry.enabled).toBe(testData.defaultCountry.enabled);
        expect(updatedCountry.iso_two_letter_code).toBe(testData.defaultCountry.iso_two_letter_code);
        expect(updatedCountry.geojson).toBe(testData.defaultCountry.geojson);
        expect(updatedCountry.lat).toBe(testData.defaultCountry.lat);
        expect(updatedCountry.lng).toBe(testData.defaultCountry.lng);
        expect(updatedCountry.created_at).toEqual(testData.defaultCountry.created_at);
    });

    test("invalid id results in 400", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/countries/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put("/api/v3/countries/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("duplicate two-letter iso code", async () => {
        const requestBody = {
            name: "Fake Country",
            enabled: true,
            iso_two_letter_code: "FC",
            lat: -35.896032,
            lng: 15.515682,
        };
        const response = await request(app).post("/api/v3/countries").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);

        const requestBody2 = {
            iso_two_letter_code: "FC",
        };

        const response2 = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send(requestBody2);
        expect(response2.statusCode).toBe(500);
    });

    describe("validation", () => {
        test("name, lat & lng not required", async () => {
            const requestBody = {
                enabled: false,
            };

            const response = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(200);
            expect(response.body.id).toBe(parseInt(testData.defaultCountry.id, 10));
            expect(response.body.state).toBe("updated");

            const updatedCountry = await knex("countries").where("id", response.body.id).first();
            // properties in the request body:
            expect(updatedCountry.enabled).toBe(requestBody.enabled);
        });

        test("created_at not allowed", async () => {
            const now = moment();

            const requestBody = {
                name: "new name",
                created_at: now.format(),
            };

            const response = await request(app).put(`/api/v3/countries/${testData.defaultCountry.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toBe("Invalid parameters provided");
        });
    });
});

describe("DELETE /api/v3/countries/:id", () => {
    test("happy path", async () => {
        // create a country that can be deleted (we can't delete testData.defaultCountry as it has an associated location)
        const result = await knex("countries").insert({
            name: "Dummy Country",
            lat: 0,
            lng: 0,
        }).returning("id");
        const countryId = result[0];

        const response = await request(app).delete(`/api/v3/countries/${countryId}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(countryId, 10));
        expect(response.body.state).toBe("deleted");

        const countryCount = await knex("countries").count("*");
        expect(countryCount[0].count).toBe("2");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).delete("/api/v3/countries/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const response = await request(app).delete("/api/v3/countries/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("deleted");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).delete(`/api/v3/countries/${testData.defaultCountry.id}`)
            .set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
