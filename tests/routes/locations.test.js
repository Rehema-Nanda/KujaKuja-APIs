"use strict";

const request = require("supertest");
const moment = require('moment');
const app = require('../../src/app');

describe("GET /api/v3/locations/:id?", () => {
    test("happy path - list", async () => {
        const response = await request(app).get("/api/v3/locations/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[0].country_name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].name).toBe(testData.defaultLocation.name);
        // testing for equality using 'toEqual' rather than 'toBe' because this column has a default value in the DB:
        expect(response.body.data[0].geojson).toEqual(testData.defaultLocation.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultLocation.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultLocation.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultLocation.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultLocation.updated_at.toISOString());
    });

    test("happy path - enabled", async () => {
        // update Uganda to be disabled
        await knex("countries").where("name", "Uganda").update({ enabled: false });

        const response = await request(app).get("/api/v3/locations/enabled").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].name).toBe("Mahama Camp");
    });

    test("happy path - fetch specific", async () => {
        const response = await request(app).get(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[0].country_name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].name).toBe(testData.defaultLocation.name);
        // testing for equality using 'toEqual' rather than 'toBe' because this column has a default value in the DB:
        expect(response.body.data[0].geojson).toEqual(testData.defaultLocation.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultLocation.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultLocation.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultLocation.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultLocation.updated_at.toISOString());
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/locations/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/locations/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/locations/invalidId").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in empty response", async () => {
        const response = await request(app).get("/api/v3/locations/99999").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);
    });
});

describe("POST /api/v3/locations/paginator", () => {
    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/locations/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[0].country_name).toBe(testData.defaultCountry.name);
        expect(response.body.data[0].name).toBe(testData.defaultLocation.name);
        // testing for equality using 'toEqual' rather than 'toBe' because this column has a default value in the DB:
        expect(response.body.data[0].geojson).toEqual(testData.defaultLocation.geojson);
        expect(response.body.data[0].lat).toBe(testData.defaultLocation.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultLocation.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultLocation.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultLocation.updated_at.toISOString());
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/locations/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/locations/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("pagination", async () => {
        const requestBody = {
            limit: 10,
            page: 1,
            sort: {
                by: "country_name",
                order: "asc",
            },
        };

        const response = await request(app).post("/api/v3/locations/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
        expect(response.body.data[0].name).toBe("Mahama Camp");
        expect(response.body.data[0].country_name).toBe("Rwanda");
    });
});

describe("POST /api/v3/locations", () => {
    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            name: "Fake Location",
            lat: -33.892032,
            lng: 18.505682,
            country_id: 1,
        };

        const response = await request(app).post("/api/v3/locations").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        const insertedLocation = await knex("settlements").where("id", response.body.id).first();
        // properties in the request body:
        expect(insertedLocation.name).toBe(requestBody.name);
        expect(insertedLocation.lat).toBe(requestBody.lat.toFixed(8));
        expect(insertedLocation.lng).toBe(requestBody.lng.toFixed(8));
        expect(insertedLocation.country_id).toBe(requestBody.country_id.toString());
        // properties set by the endpoint:
        expect(now.diff(insertedLocation.created_at, "seconds")).toBe(0);
        expect(now.diff(insertedLocation.updated_at, "seconds")).toBe(0);
        // all other properties, except id:
        // testing for equality using 'toEqual' rather than 'toBe' because this column has a default value in the DB:
        expect(insertedLocation.geojson).toEqual({});
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).post("/api/v3/locations").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).post("/api/v3/locations").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {
        test("missing required field", async () => {
            const requestBody = {
                lat: -33.892032,
                lng: 18.505682,
                country_id: 1,
            };

            const response = await request(app).post("/api/v3/locations").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.name");
            expect(response.body.error.message).toContain("is required");
        });

        test("incorrect type", async () => {
            const requestBody = {
                name: 12345,
                lat: -33.892032,
                lng: 18.505682,
                country_id: 1,
            };

            const response = await request(app).post("/api/v3/locations").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.name");
            expect(response.body.error.message).toContain("is not of a type(s) string");
        });
    });
});


describe("PUT /api/v3/locations/:id", () => {
    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(testData.defaultLocation.id, 10));
        expect(response.body.state).toBe("updated");

        const updatedLocation = await knex("settlements").where("id", response.body.id).first();
        // properties in the request body:
        expect(updatedLocation.name).toBe(requestBody.name);
        // properties set by the endpoint:
        expect(now.diff(updatedLocation.updated_at, "seconds")).toBe(0);
        // properties that should be unchanged from the seeded location:
        expect(updatedLocation.country_id).toBe(testData.defaultLocation.country_id);
        // testing for equality using 'toEqual' rather than 'toBe' because this column has a default value in the DB:
        expect(updatedLocation.geojson).toEqual(testData.defaultLocation.geojson);
        expect(updatedLocation.lat).toBe(testData.defaultLocation.lat);
        expect(updatedLocation.lng).toBe(testData.defaultLocation.lng);
        expect(updatedLocation.created_at).toEqual(testData.defaultLocation.created_at);
    });

    test("invalid id results in 400", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/locations/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put("/api/v3/locations/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).put(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {
        test("name & country_id not required", async () => {
            const requestBody = {
                lat: 0.12345,
            };

            const response = await request(app).put(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(200);
            expect(response.body.id).toBe(parseInt(testData.defaultLocation.id, 10));
            expect(response.body.state).toBe("updated");

            const updatedLocation = await knex("settlements").where("id", response.body.id).first();
            // properties in the request body:
            expect(updatedLocation.lat).toBe(requestBody.lat.toFixed(8));
        });

        test("created_at not allowed", async () => {
            const now = moment();

            const requestBody = {
                name: "new name",
                created_at: now.format(),
            };

            const response = await request(app).put(`/api/v3/locations/${testData.defaultLocation.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(400);
            expect(response.body.error.message).toContain("instance.created_at");
            expect(response.body.error.message).toContain("is of prohibited type any");
        });
    });
});

describe("DELETE /api/v3/locations/:id", () => {
    const locationIdToDelete = 999;

    beforeEach(async () => {
        await knex("settlements").insert([
            {
                id: locationIdToDelete,
                country_id: 1, // Uganda

                name: "Test Location",
                // geojson: ,
                lat: 0,
                lng: 0,
                // created_at: ,
                // updated_at:
            },
        ]);
    });

    test("happy path", async () => {
        const response = await request(app).delete(`/api/v3/locations/${locationIdToDelete}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(locationIdToDelete);
        expect(response.body.state).toBe("deleted");

        const locationCount = await knex("settlements").count("*");
        expect(locationCount[0].count).toBe("3");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).delete("/api/v3/locations/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const response = await request(app).delete("/api/v3/locations/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("deleted");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).delete(`/api/v3/locations/${testData.defaultLocation.id}`)
            .set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
