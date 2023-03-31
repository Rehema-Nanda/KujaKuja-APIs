const request = require("supertest");
const moment = require("moment");
const app = require("../../src/app");

describe("GET /api/v3/users/", () => {
    test("happy path single user --list", async () => {
        const response = await request(app).get(`/api/v3/users/${testData.nonPrivilegedUser.id}`).set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.status).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].id).toBe(testData.nonPrivilegedUser.id);
    });

    test("happy path all users --list", async () => {
        const response = await request(app).get("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.status).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.data.length).toBe(4);
        expect(response.body.data[0]).toHaveProperty("id");
        expect(response.body.data[0]).toHaveProperty("settlement_name");
        expect(response.body.data[0].settlement_name).toBe('Nakivale Base Camp');
        expect(response.body.data[0]).toHaveProperty("encrypted_password");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/users/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get(`/api/v3/users/${testData.nonPrivilegedUser.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("POST /api/v3/users/paginator", () => {
    test("happy path - list", async () => {
        const response = await request(app).post("/api/v3/users/paginator/").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.status).toBe(200);
        expect(typeof response.body.count).toBe("number");
        expect(response.body.data.length).toBe(4);
        expect(response.body.data[0]).toHaveProperty("id");
        expect(response.body.data[0]).toHaveProperty("settlement_name");
        expect(response.body.data[0].settlement_name).toBe("Nakivale Base Camp");
        expect(response.body.data[0]).toHaveProperty("encrypted_password");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).post("/api/v3/users/paginator/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).post("/api/v3/users/paginator").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("pagination", async () => {
        const requestBody = {
            limit: 3,
            page: 1,
            sort: {
                by: "email",
                order: "desc",
            },
        };

        const response = await request(app).post("/api/v3/users/paginator").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(4);
        expect(response.body.data[0].email).toBe("surveyuser@kujakuja.com");
    });
});

describe("POST /api/v3/users/", () => {
    test("happy path", async () => {
        const requestBody = {
            uid: "randomid",
            email: "test@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).post("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(200);
        expect(typeof response.body.id).toBe("number");
        expect(response.body.state).toBe("created");
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).post("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).get("/api/v3/users/");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get(`/api/v3/users/${testData.nonPrivilegedUser.id}`).set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("wrong request body data results in 422", async () => {
        const requestBody = {
            uid: "randomid",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).post("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(422);
        expect(response.body.error[0].stack).toContain("instance.email is required");
    });

    test("attempt to create user with duplicate of existing email results in 500", async () => {
        // a user with email "adminuser@kujakuja.com" already exists in test database, created as part of database seed
        // routine (see tests/setup.js)
        const requestBody = {
            uid: "randomid",
            email: "adminuser@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).post("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(500);
        expect(response.error.stack).toContain("Error: cannot POST /api/v3/users/ (500)");
    });

    test("attempt to create user with invalid email results in 422", async () => {
        const requestBody = {
            uid: "randomid",
            email: "adminuserkujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).post("/api/v3/users/").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(422);
        expect(response.body.error[0].stack).toContain("instance.email does not conform to the \"email\" format");
    });
});

describe("PUT /api/v3/users/:id", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later
        const todayMiddayFormatted = todayMidday.format();

        // create a user
        await knex("users").insert(
            {
                uid: "testupdateuser@kujakuja.com",
                email: "testupdateuser@kujakuja.com",
                encrypted_password: "ransdjfbfmrfjfn",
                is_admin: false,
                is_survey: false,
                is_service_provider: false,
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        );
    });

    test("happy path", async () => {
        const requestBody = {
            uid: "randomid",
            email: "test@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.state).toBe("updated");
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("unauthenticated user results in 401", async () => {
        const requestBody = {
            uid: "randomid",
            email: "test@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            uid: "randomid",
            email: "test@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("cannot change uid of existing user", async () => {
        const [userBeforePut] = await knex("users").select("uid").where("id", 1);
        const userUidBeforePut = userBeforePut.uid;

        const requestBody = {
            uid: "testupdateuser@kujakuja.com",
            email: "test@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.state).toBe("updated");

        const [userAfterPut] = await knex("users").select("uid").where("id", 1);
        const userUidAfterPut = userAfterPut.uid;

        expect(userUidBeforePut).toEqual(userUidAfterPut);
    });

    test("attempt to update user with duplicate of existing email results in 500", async () => {
        // a different user with email "serviceprovideruser@kujakuja.com" already exists in test database, created as
        // part of database seed routine (see tests/setup.js)
        const requestBody = {
            uid: "serviceprovideruser@kujakuja.com",
            email: "serviceprovideruser@kujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(500);
        expect(response.error.stack).toContain("Error: cannot PUT /api/v3/users/1 (500)");
    });

    test("attempt to update user with invalid email results in 400", async () => {
        const requestBody = {
            uid: "serviceprovideruser@kujakuja.com",
            email: "serviceprovideruserkujakuja.com",
            encrypted_password: "password",
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3,
        };
        const response = await request(app).put("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toEqual("instance.email does not conform to the \"email\" format");
    });
});

describe("DELETE /api/v3/users/:id", () => {
    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf("hour"); // fix the time for easier assertions later
        const todayMiddayFormatted = todayMidday.format();

        // create a user
        await knex("users").insert(
            {
                uid: "testupdateuser@kujakuja.com",
                email: "testupdateuser@kujakuja.com",
                encrypted_password: "ransdjfbfmrfjfn",
                is_admin: false,
                is_survey: false,
                is_service_provider: false,
                created_at: todayMiddayFormatted,
                updated_at: todayMiddayFormatted,
                settlement_id: testData.defaultLocation.id,
            },
        );
    });

    test("happy path", async () => {
        const response = await request(app).delete("/api/v3/users/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.state).toBe("deleted");
    });

    test("invalid id results in 400", async () => {
        const response = await request(app).delete("/api/v3/users/invalidId").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Invalid parameters provided");
    });

    test("unauthenticated user results in 401", async () => {
        const response = await request(app).delete("/api/v3/users/1");
        expect(response.statusCode).toBe(401);
        expect(response.text).toBe("Unauthorized");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).delete("/api/v3/users/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});
