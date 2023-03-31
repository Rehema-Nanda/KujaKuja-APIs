const request = require("supertest");
const app = require("../../src/app");

describe("GET /api/v3/tags", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tags").insert([
            {
                response_id: 1,
                name: "homework",
            },
            {
                response_id: 2,
                name: "testtag",
            },
            {
                response_id: 2,
                name: "homework",
            },
        ]);
    });

    test("happy path", async () => {
        const response = await request(app).get("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.length).toBe(2);
        expect(response.body.data[0].name).toBe("homework");
        expect(response.body.data[1].name).toBe("testtag");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("GET /api/v3/tags/tag_filters/:id", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tag_filters").insert([
            {
                tag_text: "water",
                search_text: "aqua|water",
            },
            {
                tag_text: "People",
                search_text: "humans|brain",
            },
            {
                tag_text: "school",
                search_text: "assignement|books",
            },
        ]);
        await knex("tag_filter_settlements").insert([
            {
                tag_filter_id: 2,
                settlement_id: 1,
            },
            {
                tag_filter_id: 3,
                settlement_id: 2,
            },
            {
                tag_filter_id: 3,
                settlement_id: 3,
            },
        ]);
    });

    test("happy path", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.tag_text).toBe("water");
        expect(response.body.data.search_text).toBe("aqua|water");
        expect(response.body.data.locations).toBe("");
    });

    test("happy path with one tag filter location", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/2").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.tag_text).toBe("People");
        expect(response.body.data.search_text).toBe("humans|brain");
        expect(response.body.data.locations).toBe("Nakivale Base Camp");
    });

    test("happy path with more than one tag filter location", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/3").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.tag_text).toBe("school");
        expect(response.body.data.search_text).toBe("assignement|books");
        expect(response.body.data.locations).toBe("Mahama Camp, Bidi Bidi Zone 5");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("non existent id return empty", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/99999").set("Authorization", `Bearer ${testData.surveyUser.authToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject(
            {},
        );
    });
});

describe("PUT /api/v3/tags/tag_filters/:id", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tag_filters").insert([
            {
                tag_text: "water",
                search_text: "aqua|water",
            },
            {
                tag_text: "People",
                search_text: "humans|brain",
            },
            {
                tag_text: "school",
                search_text: "assignement|books",
            },
        ]);
    });

    test("happy path", async () => {
        const requestBody = {
            tag_text: "something related to water",
        };
        const response = await request(app).put("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe("1");
        expect(response.body.status).toBe("updated");
        const updatedResponse = await knex("tag_filters").select().where("id", 1);
        expect(updatedResponse[0].tag_text).toBe(requestBody.tag_text);
    });

    test("non-existent id results in 500", async () => {
        const requestBody = {
            name: "new name",
        };

        const response = await request(app).put("/api/v3/tags/tag_filters/99999").set("Authorization", `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(500);
    });

    test("empty request body results in 400", async () => {
        const response = await request(app).put("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.adminUser.authToken}`)
            .send("");
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing data");
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            contents: "shouldn't matter",
        };

        const response = await request(app).put("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`)
            .send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("POST /api/v3/tags", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
    });

    test("happy path", async () => {
        const requestBody = {
            response_id: 1,
            tag: "homework",
        };
        const response = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        const insertedTags = await knex("tags").select();
        expect(insertedTags.length).toBe(1);
        expect(insertedTags[0].response_id).toBe(requestBody.response_id.toString());
        expect(insertedTags[0].name).toBe(requestBody.tag);
    });

    test("non-privileged user results in 401", async () => {
        const requestBody = {
            response_id: 1,
            tag: "homework",
        };
        const response = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("missing response ID results in 400", async () => {
        const requestBody = {
            tag: "homework",
        };
        const response = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing 'tag' and/or 'response_id' parameters");
    });

    test("missing tag results in 400", async () => {
        const requestBody = {
            response_id: 1,
        };
        const response = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing 'tag' and/or 'response_id' parameters");
    });

    test("duplicate tags for the same response are ignored", async () => {
        const requestBody = {
            response_id: 1,
            tag: "homework",
        };
        const response1 = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response1.statusCode).toBe(200);

        const response2 = await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response2.statusCode).toBe(200);

        const insertedTags = await knex("tags").select();
        expect(insertedTags.length).toBe(1);
    });
});

describe("GET /api/v3/tags/tag_filters", () => {
    beforeEach(async () => {
        await knex("tag_filters").insert([
            {
                tag_text: "testTag",
                search_text: "test|sample",
            },
        ]);
    });

    test("happy path", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(200);
        const insertedTagFilters = await knex("tag_filters").select();
        expect(insertedTagFilters.length).toBe(1);
        expect(insertedTagFilters[0].tag_text).toBe("testTag");
        expect(insertedTagFilters[0].search_text).toBe("test|sample");
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send();
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("DELETE /api/v3/tags", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        const requestBody = {
            response_id: 1,
            tag: "test",
        };
        await request(app).post("/api/v3/tags").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
    });

    test("happy path", async () => {
        const requestBody = {
            tag: "test",
        };

        const deleteTag = await request(app).delete("/api/v3/tags/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(deleteTag.statusCode).toBe(200);
    });

    test("non-privileged user results in 401", async () => {
        const deleteTag = await request(app).delete("/api/v3/tags/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send({ tag: "test" });
        expect(deleteTag.statusCode).toBe(401);
        expect(deleteTag.body.error.message).toBe("Insufficient permissions");
    });

    test("missing tag results in 400", async () => {
        const response = await request(app).delete("/api/v3/tags/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send({});
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Missing 'tag' parameter");
    });
});

describe("GET /api/v3/tags/tag_filters/:id", () => {
    beforeEach(async () => {
        await knex("tag_filters").insert([
            { tag_text: "water", search_text: "water|aqua" },
        ]);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send();
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("happy path", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(200);
        expect(response.body.data.tag_text).toBe("water");
        expect(response.body.data.search_text).toBe("water|aqua");
    });

    test("malformed id returns 500", async () => {
        const response = await request(app).get("/api/v3/tags/tag_filters/tree").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(500);
    });

});

describe("POST /api/v3/tags/tag_filters", () => {
    test("non-privileged user results in 401", async () => {
        const requestBody = {
            tag_text: "test non privileged",
            search_text: "test|non",
        };
        const response = await request(app).post("/api/v3/tags/tag_filters").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("happy path", async () => {
        const requestBody = {
            tag_text: "test privileged",
            search_text: "test|previleged",
        };
        const response = await request(app).post("/api/v3/tags/tag_filters").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        const insertedTagFilters = await knex("tag_filters").select();
        expect(insertedTagFilters.length).toBe(1);
        expect(insertedTagFilters[0].tag_text).toBe(requestBody.tag_text.toString());
        expect(insertedTagFilters[0].search_text).toBe(requestBody.search_text);
    });
});

describe("GET /api/v3/tags/bulk_tag", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tag_filters").insert([
            { tag_text: "water", search_text: "water|aqua" },
        ]);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send();
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });
});

describe("GET /api/v3/tags/bulk_tag/:id", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tag_filters").insert([
            { tag_text: "water", search_text: "water|aqua" },
        ]);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send();
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("malformed id returns 500", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/undefined").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(500);
    });

    test("happy path", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(200);
    });
});

describe("GET /api/v3/tags/bulk_tag/undo/:id", () => {
    beforeEach(async () => {
        await knex("responses").insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "Zero: Tap monitors should ensure stagnant water is effectively treated",
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                idea: "One: I would suggest providing aqua tabs for the tap monitors to ensure clean water.",
            },
        ]);
        await knex("tag_filters").insert([
            { tag_text: "water", search_text: "water|aqua" },
        ]);
    });

    test("non-privileged user results in 401", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/undo/1").set("Authorization", `Bearer ${testData.nonPrivilegedUser.authToken}`).send();
        expect(response.statusCode).toBe(401);
        expect(response.body.error.message).toBe("Insufficient permissions");
    });

    test("malformed id returns 500", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/undo/undefined").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(500);
    });

    test("undoing unapplied tag results in 400", async () => {
        const response = await request(app).get("/api/v3/tags/bulk_tag/undo/1").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toBe("Tag filter cannot be undone.");
    });

    test("happy path", async () => {
        await knex("tag_filters").insert([
            { tag_text: "Health", search_text: "medicine|hospital", status: "ACTIVE" },
        ]);
        const response = await request(app).get("/api/v3/tags/bulk_tag/undo/2").set("Authorization", `Bearer ${testData.surveyUser.authToken}`).send();
        expect(response.statusCode).toBe(200);
    });
});
