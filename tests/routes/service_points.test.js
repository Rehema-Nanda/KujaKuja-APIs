"use strict";

const request = require("supertest");
const moment = require("moment");
const uuid = require("uuid/v4");
const app = require("../../src/app");

describe("GET /api/v3/service_points/:id?", () => {

    test("happy path - list", async () => {
        const response = await request(app).get("/api/v3/service_points/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        // properties that should be unchanged from the seeded service point:
        expect(response.body.data[0].service_type_id).toBe(testData.defaultServicePoint.service_type_id);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultServicePoint.settlement_id);
        expect(response.body.data[0].name).toBe(testData.defaultServicePoint.name);
        expect(response.body.data[0].lat).toBe(testData.defaultServicePoint.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultServicePoint.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultServicePoint.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultServicePoint.updated_at.toISOString());
        expect(response.body.data[0].settlement_name).toBe(testData.defaultLocation.name);
        expect(response.body.data[0].service_type_name).toBe(testData.defaultServiceType.name);
    });

    test("happy path - fetch specific", async () => {
        const response = await request(app).get(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        // properties that should be unchanged from the seeded service point:
        expect(response.body.data[0].service_type_id).toBe(testData.defaultServicePoint.service_type_id);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultServicePoint.settlement_id);
        expect(response.body.data[0].name).toBe(testData.defaultServicePoint.name);
        expect(response.body.data[0].lat).toBe(testData.defaultServicePoint.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultServicePoint.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultServicePoint.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultServicePoint.updated_at.toISOString());
        expect(response.body.data[0].service_type_name).toBe("Water");
        expect(response.body.data[0].settlement_name).toBe("Nakivale Base Camp");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/service_points/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/service_points/").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/service_points/invalidId").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in empty response", async () => {
        const response = await request(app).get("/api/v3/service_points/99999").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);
    });

});

describe("GET /api/v3/service_points/location/:id", () => {

    test("happy path", async () => {
        const response = await request(app).get(`/api/v3/service_points/location/${testData.defaultServicePoint.settlement_id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(2);
        // properties that should be unchanged from the seeded service point:
        expect(response.body.data[0].service_type_id).toBe(testData.defaultServicePoint.service_type_id);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultServicePoint.settlement_id);
        expect(response.body.data[0].name).toBe(testData.defaultServicePoint.name);
        expect(response.body.data[0].service_type_name).toBe(testData.defaultServiceType.name);
        expect(response.body.data[0].lat).toBe(testData.defaultServicePoint.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultServicePoint.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultServicePoint.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultServicePoint.updated_at.toISOString());
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/service_points/location/99").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/service_points/location/invalidId").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in empty response", async () => {
        const response = await request(app).get("/api/v3/service_points/location/99999").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);
    });

});

describe("POST /api/v3/service_points/paginator", () => {
    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/service_points/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        // properties that should be unchanged from the seeded location:
        expect(response.body.data[0].service_type_id).toBe(testData.defaultServicePoint.service_type_id);
        expect(response.body.data[0].settlement_id).toBe(testData.defaultServicePoint.settlement_id);
        expect(response.body.data[0].name).toBe(testData.defaultServicePoint.name);
        expect(response.body.data[0].service_type_name).toBe(testData.defaultServiceType.name);
        expect(response.body.data[0].lat).toBe(testData.defaultServicePoint.lat);
        expect(response.body.data[0].lng).toBe(testData.defaultServicePoint.lng);
        expect(response.body.data[0].created_at).toBe(testData.defaultServicePoint.created_at.toISOString());
        expect(response.body.data[0].updated_at).toBe(testData.defaultServicePoint.updated_at.toISOString());
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/service_points/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/service_points/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
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
                by: "service_type_name",
                order: "asc",
            },
        };

        response = await request(app).post("/api/v3/service_points/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].name).toBe("OPD - Mahama 1 Health Center");

        requestBody = {
            limit: 3,
            page: 1,
            sort: {
                by: "settlement_name",
                order: "desc",
            },
        };

        response = await request(app).post("/api/v3/service_points/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].settlement_name).toBe("Nakivale Base Camp");
    });
});

describe("POST /api/v3/service_points", () => {

    test("happy path", async () => {
        let now = moment();

        let requestBody = {
            "service_type_id": 1,
            "settlement_id": 1,
            "name": "Spaghetti-Monster Bait Station",
            "lat": -33.892032,
            "lng": 18.505682
        };

        const response = await request(app).post("/api/v3/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        let insertedServicePoint = await knex("service_points").where("id", response.body.id).first();
        // properties in the request body:
        expect(insertedServicePoint.service_type_id).toBe(requestBody.service_type_id.toString());
        expect(insertedServicePoint.settlement_id).toBe(requestBody.settlement_id.toString());
        expect(insertedServicePoint.name).toBe(requestBody.name);
        expect(insertedServicePoint.lat).toBe(requestBody.lat.toFixed(8));
        expect(insertedServicePoint.lng).toBe(requestBody.lng.toFixed(8));
        // properties set by the endpoint:
        expect(now.diff(insertedServicePoint.created_at, "seconds")).toBe(0);
        expect(now.diff(insertedServicePoint.updated_at, "seconds")).toBe(0);
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).post("/api/v3/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        let requestBody = {
            "contents": "shouldn't matter"
        };

        const response = await request(app).post("/api/v3/service_points").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {

        test("missing required field", async () => {
            let requestBody = {
                "service_type_id": 1,
                "settlement_id": 1,
                "lat": -33.892032,
                "lng": 18.505682
            };

            const response = await request(app).post("/api/v3/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(1);
            expect(response.body.error[0].property).toBe("instance.name");
            expect(response.body.error[0].message).toBe("is required");
        });

        // skipping temporarily due to changes made in 950caae
        test.skip("incorrect type", async () => {
            let requestBody = {
                "service_type_id": "should be an integer",
                "settlement_id": 1,
                "name": "Spaghetti-Monster Bait Station",
                "lat": -33.892032,
                "lng": 18.505682
            };

            const response = await request(app).post("/api/v3/service_points").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(1);
            expect(response.body.error[0].property).toBe("instance.service_type_id");
            expect(response.body.error[0].message).toBe("is not of a type(s) integer");
            expect(response.body.error[0].instance).toBe("should be an integer");
        });

    });

});

describe("PUT /api/v3/service_points/:id", () => {

    test("happy path", async () => {
        let now = moment();

        let requestBody = {
            "name": "new name"
        };

        const response = await request(app).put(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(testData.defaultServicePoint.id, 10));
        expect(response.body.state).toBe("updated");

        let updatedServicePoint = await knex("service_points").where("id", response.body.id).first();
        // properties in the request body:
        expect(updatedServicePoint.name).toBe(requestBody.name);
        // properties set by the endpoint:
        expect(now.diff(updatedServicePoint.updated_at, "seconds")).toBe(0);
        // properties that should be unchanged from the seeded service point:
        expect(updatedServicePoint.service_type_id).toBe(testData.defaultServicePoint.service_type_id);
        expect(updatedServicePoint.settlement_id).toBe(testData.defaultServicePoint.settlement_id);
        expect(updatedServicePoint.lat).toBe(testData.defaultServicePoint.lat);
        expect(updatedServicePoint.lng).toBe(testData.defaultServicePoint.lng);
        expect(updatedServicePoint.created_at).toEqual(testData.defaultServicePoint.created_at);
    });

    test("invalid id results in 400", async () => {
        let requestBody = {
            "contents": "shouldn't matter"
        };

        const response = await request(app).put("/api/v3/service_points/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        let requestBody = {
            "name": "new name"
        };

        const response = await request(app).put("/api/v3/service_points/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).put(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        let requestBody = {
            "contents": "shouldn't matter"
        };

        const response = await request(app).put(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    describe("validation", () => {

        test("name not required", async () => {
            let requestBody = {
                "settlement_id": 2
            };

            const response = await request(app).put(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(200);
            expect(response.body.id).toBe(parseInt(testData.defaultServicePoint.id, 10));
            expect(response.body.state).toBe("updated");

            let updatedServicePoint = await knex("service_points").where("id", response.body.id).first();
            // properties in the request body:
            expect(updatedServicePoint.settlement_id).toBe(requestBody.settlement_id.toString());
        });

        test("created_at not allowed", async () => {
            let now = moment();

            let requestBody = {
                "name": "new name",
                "created_at": now.format()
            };

            const response = await request(app).put(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(1);
            expect(response.body.error[0].property).toBe("instance.created_at");
            expect(response.body.error[0].message).toBe("is of prohibited type any");
            expect(response.body.error[0].instance).toBe(now.format());
        });

    });

});

describe("DELETE /api/v3/service_points/:id", () => {

    test("happy path", async () => {
        const response = await request(app).delete(`/api/v3/service_points/${testData.defaultServicePoint.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(testData.defaultServicePoint.id, 10));
        expect(response.body.state).toBe("deleted");

        let servicePointCount = await knex("service_points").count("*");
        expect(servicePointCount[0].count).toBe("3");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).delete("/api/v3/service_points/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        const response = await request(app).delete("/api/v3/service_points/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBeNull();
        expect(response.body.state).toBe("deleted");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).delete(`/api/v3/service_points/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

});

describe("GET /api/v3/service_points/availability/:id/:start/:end", () => {
    beforeEach(async () => {
        // create some service point availability records
        await knex("service_point_availabilities").insert([
            {
                service_point_id: testData.defaultServicePoint.id,
                available: true,
                created_at: "2018-11-14T05:04:02Z",
                uploaded_at: "2018-11-14T14:15:00Z",
                availability_time: "2018-11-14T05:04:02Z",
                unique_id: uuid()
            },
            {
                service_point_id: testData.defaultServicePoint.id,
                available: false,
                created_at: "2018-11-14T14:00:00Z",
                uploaded_at: "2018-11-14T14:15:00Z",
                availability_time: "2018-11-14T14:00:00Z",
                unique_id: uuid()
            },
            // no data on the 15th
            {
                service_point_id: testData.defaultServicePoint.id,
                available: true,
                created_at: "2018-11-16T05:00:00Z",
                uploaded_at: "2018-11-16T14:15:00Z",
                availability_time: "2018-11-16T05:00:00Z",
                unique_id: uuid()
            },
            {
                service_point_id: testData.defaultServicePoint.id,
                available: false,
                created_at: "2018-11-16T09:00:00Z",
                uploaded_at: "2018-11-16T14:15:00Z",
                availability_time: "2018-11-16T09:00:00Z",
                unique_id: uuid()
            },
            {
                service_point_id: testData.defaultServicePoint.id,
                available: true,
                created_at: "2018-11-16T10:00:00Z",
                uploaded_at: "2018-11-16T14:15:00Z",
                availability_time: "2018-11-16T10:00:00Z",
                unique_id: uuid()
            },
            {
                service_point_id: testData.defaultServicePoint.id,
                available: false,
                created_at: "2018-11-16T14:00:00Z",
                uploaded_at: "2018-11-16T14:15:00Z",
                availability_time: "2018-11-16T14:00:00Z",
                unique_id: uuid()
            },
            // only an 'available' record on the 17th:
            {
                service_point_id: testData.defaultServicePoint.id,
                available: true,
                created_at: "2018-11-17T05:00:00Z",
                uploaded_at: "2018-11-17T14:15:00Z",
                availability_time: "2018-11-17T05:00:00Z",
                unique_id: uuid()
            },
            // only an 'unavailable' record on the 18th:
            {
                service_point_id: testData.defaultServicePoint.id,
                available: false,
                created_at: "2018-11-18T14:00:00Z",
                uploaded_at: "2018-11-18T14:15:00Z",
                availability_time: "2018-11-18T14:00:00Z",
                unique_id: uuid()
            },
            // this last record falls into the 18th in UTC but is on the 19th in UTC+3, as an additional test that we're getting service point local time
            {
                service_point_id: testData.defaultServicePoint.id,
                available: true,
                created_at: "2018-11-18T22:00:00Z",
                uploaded_at: "2018-11-18T22:15:00Z",
                availability_time: "2018-11-18T22:00:00Z",
                unique_id: uuid()
            },
        ]);
    });

    test("happy path", async () => {
        const response = await request(app).get(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}/2018-11-14/2018-11-19`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(5);
        expect(response.body).toHaveProperty("data", {
            "2018-11-14": {
                "date": "2018-11-14",
                "start": 484,
                "end": 1020,
                "service_point_id": 1
            },
            "2018-11-15": {
                "date": "2018-11-15",
                "start": 0,
                "end": 0,
                "service_point_id": 1
            },
            "2018-11-16": {
                "date": "2018-11-16",
                "start": 480,
                "end": 1020,
                "service_point_id": 1
            },
            "2018-11-17": {
                "date": "2018-11-17",
                "start": 480,
                "end": 0,
                "service_point_id": 1
            },
            "2018-11-18": {
                "date": "2018-11-18",
                "start": 0,
                "end": 1020,
                "service_point_id": 1
            }
        });
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}/2018-11-14/2018-11-19`)
            .set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/service_points/availability/invalidId/2018-11-14/2018-11-19")
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("invalid start date results in 400", async () => {
        const response = await request(app).get(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}/14 Nov 2018/2018-11-19`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("invalid end date results in 400", async () => {
        const response = await request(app).get(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}/2018-11-14/19-11-2018`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("missing ISO two-letter code or time zone offset information for a country results in 500", async () => {
        // create a service point that isn't linked to a location or country and for which a ISO two-letter code can't be fetched
        let result = await knex("service_points").insert({
            name: "Alpaca Milking Station"
        }).returning("id");
        let spId = result[0];

        const response1 = await request(app).get(`/api/v3/service_points/availability/${spId}/2018-11-14/2018-11-19`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response1.statusCode).toBe(500);
        expect(response1.body.error.message).toBe(`Missing ISO two-letter country code or offset information for service point ID: ${spId}`);

        // link the service point above to a location and country for which we don't have offset information
        result = await knex("countries").insert({
            enabled: true,
            name: "South Africa",
            iso_two_letter_code: "ZA"
        }).returning("id");
        let countryId = result[0];

        result = await knex("settlements").insert({
            country_id: countryId,
            name: "Cape Fur Seal Commune"
        }).returning("id");
        let locationId = result[0];

        await knex("service_points").where("id", spId).update({"settlement_id": locationId});

        const response2 = await request(app).get(`/api/v3/service_points/availability/${spId}/2018-11-14/2018-11-19`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response2.statusCode).toBe(500);
        expect(response2.body.error.message).toBe(`Missing ISO two-letter country code or offset information for service point ID: ${spId}`);
    });

    test("start date and end date get swapped if start > end", async () => {
        const response = await request(app).get(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}/2018-11-19/2018-11-14`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(5);
        expect(response.body.data).toHaveProperty("2018-11-14");
        expect(response.body.data).toHaveProperty("2018-11-15");
        expect(response.body.data).toHaveProperty("2018-11-16");
        expect(response.body.data).toHaveProperty("2018-11-17");
        expect(response.body.data).toHaveProperty("2018-11-18");
    });
});

describe("POST /api/v3/service_points/availability/:id", () => {

    test("happy path", async () => {
        let now = moment();
        let uniqueId = uuid();

        let requestBody = {
            "available": true,
            "created_at": now.format(),
            "availability_time": now.format(),
            "unique_id": uniqueId
        };

        const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        let insertedServicePointAvailability = await knex("service_point_availabilities").first();
        // properties in the route params:
        expect(insertedServicePointAvailability.service_point_id).toBe(testData.defaultServicePoint.id);
        // properties in the request body:
        expect(insertedServicePointAvailability.available).toBe(requestBody.available);
        expect(insertedServicePointAvailability.created_at).toStrictEqual(moment(requestBody.created_at).toDate());
        expect(insertedServicePointAvailability.availability_time).toStrictEqual(moment(requestBody.availability_time).toDate());
        expect(insertedServicePointAvailability.unique_id).toBe(requestBody.unique_id);
        // properties set by the endpoint:
        expect(now.diff(insertedServicePointAvailability.uploaded_at, "seconds")).toBe(0);
    });

    test("explicit time zone diff", async () => {
        let now = moment().utcOffset(180);
        let uniqueId = uuid();

        let requestBody = {
            "available": true,
            "created_at": now.format(),
            "availability_time": now.clone().add(2, "hours").format(),
            "unique_id": uniqueId
        };

        const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        let insertedServicePointAvailability = await knex("service_point_availabilities").first();
        // properties in the route params:
        expect(insertedServicePointAvailability.service_point_id).toBe(testData.defaultServicePoint.id);
        // properties in the request body:
        expect(insertedServicePointAvailability.available).toBe(requestBody.available);
        expect(insertedServicePointAvailability.created_at).toStrictEqual(moment(requestBody.created_at).toDate());
        expect(insertedServicePointAvailability.availability_time).toStrictEqual(moment(requestBody.availability_time).toDate());
        expect(insertedServicePointAvailability.unique_id).toBe(requestBody.unique_id);
        // properties set by the endpoint:
        expect(now.diff(insertedServicePointAvailability.uploaded_at, "seconds")).toBe(0);
    });

    test("invalid id results in 400", async () => {
        let requestBody = {
            "contents": "shouldn't matter"
        };

        const response = await request(app).post("/api/v3/service_points/availability/invalidId")
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        let requestBody = {
            "contents": "shouldn't matter"
        };

        const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("duplicate availability entries are ignored", async () => {
        let now = moment();
        let uniqueId = uuid();

        let requestBody = {
            "available": true,
            "created_at": now.format(),
            "availability_time": now.format(),
            "unique_id": uniqueId
        };

        let response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);

        let availabilityEntryCount = await knex("service_point_availabilities").count("*");
        expect(availabilityEntryCount[0].count).toBe("1");

        // submit the same availability entry again
        response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
            .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);

        availabilityEntryCount = await knex("service_point_availabilities").count("*");
        expect(availabilityEntryCount[0].count).toBe("1");
    });

    describe("validation", () => {

        test("missing required field", async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = {
                "created_at": now.format(),
                "availability_time": now.format(),
                "unique_id": uniqueId
            };

            const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
                .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(1);
            expect(response.body.error[0].property).toBe("instance");
            expect(response.body.error[0].message).toBe('requires property "available"');
        });

        test("incorrect type", async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = {
                "available": "should be boolean",
                "created_at": now.format(),
                "availability_time": now.format(),
                "unique_id": uniqueId
            };

            const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
                .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(1);
            expect(response.body.error[0].property).toBe("instance.available");
            expect(response.body.error[0].message).toBe("is not of a type(s) boolean");
            expect(response.body.error[0].instance).toBe("should be boolean");
        });

        test("non-ISO8601 datetimes result in 422", async () => {
            let now = moment();
            let uniqueId = uuid();

            let requestBody = {
                "available": true,
                "created_at": now.format("YYYY/MM/DD HH:mm:ss"),
                "availability_time": now.format("YYYY/MM/DD HH:mm:ss"),
                "unique_id": uniqueId
            };

            const response = await request(app).post(`/api/v3/service_points/availability/${testData.defaultServicePoint.id}`)
                .set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
                .send(requestBody);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toHaveLength(2);

            expect(response.body.error[0].property).toBe("instance.created_at");
            expect(response.body.error[0].message).toBe('does not conform to the "date-time" format');
            expect(response.body.error[0].instance).toBe(requestBody.created_at);

            expect(response.body.error[1].property).toBe("instance.availability_time");
            expect(response.body.error[1].message).toBe('does not conform to the "date-time" format');
            expect(response.body.error[1].instance).toBe(requestBody.availability_time);
        });

    });

});
