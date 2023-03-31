const request = require("supertest");
const moment = require("moment");
const app = require("../../src/app");

describe("GET /api/v3/service_types/:id?", () => {
    test("happy path --list", async () => {
        const response = await request(app).get("/api/v3/service_types/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.data[0].name).toBe("Water");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/service_types/1");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/service_types/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).get("/api/v3/service_types/invalidId").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Malformed id");
    });


});

describe("POST /api/v3/service_types/paginator", () => {
    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/service_types/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].name).toBe("Water");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/service_types/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/service_types/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("pagination", async () => {
        const requestBody = {
            limit: 3,
            page: 1,
            sort: {
                by: "name",
                order: "asc",
            },
        };

        const response = await request(app).post("/api/v3/service_types/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].name).toBe("Healthcare");
    });
});

describe("POST /api/v3/service_types/", () => {
    test("happy path ", async () => {
        const requestBody = {
            name: "Group Activities",
        };

        const response = await request(app).post("/api/v3/service_types/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");

        const insertedServiceType = await knex("service_types").where("id", response.body.id).first();
        expect(insertedServiceType.name).toBe(requestBody.name);
    });

    test("fails when no body is provided", async () => {
        const requestBody = {};

        const response = await request(app).post("/api/v3/service_types/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("unauthenticated user results in 401", async () => {
        const requestBody = {
            name: "Group Activities",
        };

        const response = await request(app).post("/api/v3/service_types/1").send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            name: "Group Activities",
        };

        const response = await request(app).get("/api/v3/service_types/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("wrong data results in 400", async () => {
        const requestBody = {
            id: 5,
        };

        const response = await request(app).post("/api/v3/service_types/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("instance.id is of prohibited type any,instance.name is required");
    });
});

describe("PUT /api/v3/service_types/:id", () => {

    test("happy path", async () => {
        const now = moment();

        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put(`/api/v3/service_types/${testData.defaultServiceType.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(parseInt(testData.defaultServiceType.id, 10));
        expect(response.body.state).toBe("updated");

        const updatedServiceType = await knex("service_types").where("id", response.body.id).first();
        // properties in the request body:
        expect(updatedServiceType.name).toBe(requestBody.name);
        // properties set by the endpoint:
        expect(now.diff(updatedServiceType.updated_at, "seconds")).toBe(0);
    });

    test("invalid id results in 400", async () => {
        let requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/service_types/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("non-existent id results in 200 and affects no records", async () => {
        let requestBody = {
            name: "new name",
        };

        const response = await request(app).put("/api/v3/service_types/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(0);
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 422", async () => {
        const response = await request(app).put(`/api/v3/service_types/${testData.defaultServiceType.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        let requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put(`/api/v3/service_types/${testData.defaultServiceType.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
