"use strict";

const request = require("supertest");
const app = require("../../src/app");

test("GET /", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Hello, world!");
});
