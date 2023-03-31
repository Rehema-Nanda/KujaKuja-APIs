'use strict';

const request = require('supertest');
const app = require('../../src/app');
const moment = require('moment');

describe('POST /api/v3/aggregate', () => {

    beforeEach(async () => {
        const todayMidday = moment.utc().hours(12).startOf('hour'); // fix the time for easier assertions later

        const tenDaysAgoFormatted = todayMidday.clone().subtract(10, 'days').format();
        const eightDaysAgoFormatted = todayMidday.clone().subtract(8, 'days').format();
        const fourDaysAgoFormatted = todayMidday.clone().subtract(4, 'days').format();
        const threeDaysAgoFormatted = todayMidday.clone().subtract(3, 'days').format();
        const twoDaysAgoFormatted = todayMidday.clone().subtract(2, 'days').format();
        const oneDayAgoFormatted = todayMidday.clone().subtract(1, 'days').format();

        // create some responses with ideas
        await knex('responses').insert([
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: true,
                created_at: tenDaysAgoFormatted,
                updated_at: tenDaysAgoFormatted
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: true,
                created_at: tenDaysAgoFormatted,
                updated_at: tenDaysAgoFormatted
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: true,
                created_at: tenDaysAgoFormatted,
                updated_at: tenDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: false,
                created_at: tenDaysAgoFormatted,
                updated_at: tenDaysAgoFormatted
            },

            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: false,
                created_at: eightDaysAgoFormatted,
                updated_at: eightDaysAgoFormatted
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: false,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: true,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 1, // "Talking Stick", Water, Nakivale Base Camp, Uganda
                satisfied: false,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: false,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: true,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: false,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: false,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: true,
                created_at: fourDaysAgoFormatted,
                updated_at: fourDaysAgoFormatted
            },
            {
                service_point_id: 2, // "Reception Center", Protection, Nakivale Base Camp, Uganda
                satisfied: false,
                created_at: threeDaysAgoFormatted,
                updated_at: threeDaysAgoFormatted
            },
            {
                service_point_id: 3, // "OPD - Mahama 1 Health Center", Healthcare, Mahama Camp, Rwanda
                satisfied: false,
                created_at: twoDaysAgoFormatted,
                updated_at: twoDaysAgoFormatted
            },
            {
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                satisfied: false,
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },
            {
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                satisfied: false,
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },
            {
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                satisfied: false,
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },
            // this last response should always be excluded as the 'idea' is null
            {
                satisfied: false,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },
            {
                satisfied: false,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },
            {
                satisfied: false,
                service_point_id: 4, // "Door to Door - Nutrition - Mahama", Nutrition, Mahama Camp, Rwanda
                created_at: oneDayAgoFormatted,
                updated_at: oneDayAgoFormatted
            },

        ]);
    });

    test('happy path', async () => {
        const now = moment.utc().startOf('day');

        const eightDaysAgo = now.clone().subtract(8, 'days');
        const twoDaysAgo = now.clone().subtract(2, 'days');

        const start2 = eightDaysAgo.clone();
        start2.subtract(twoDaysAgo.diff(eightDaysAgo, 'days'), 'days');

        const requestBody = {
            "start": eightDaysAgo.format('YYYY-MM-DD'),
            "end": twoDaysAgo.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start1).toBe(eightDaysAgo.format());
        expect(response.body.dates.start2).toBe(start2.format());
        expect(response.body.dates.end).toBe(twoDaysAgo.format());

        expect(response.body.satisfied1).toBe(10);
        expect(response.body.total1).toBe(3);
        expect(response.body.pourcent1).toBe(30);

        expect(response.body.satisfied2).toBe(4);
        expect(response.body.total2).toBe(3);
        expect(response.body.pourcent2).toBe(75);
        expect(response.body.delta).toBe(-60);
    });

    test('null satisfaction data', async () => {
        const now = moment.utc().startOf('day');

        const tenDaysAgo = now.clone().subtract(10, 'days');
        const eightDaysAgo = now.clone().subtract(8, 'days');

        const start2 = tenDaysAgo.clone();
        start2.subtract(eightDaysAgo.diff(tenDaysAgo, 'days'), 'days');

        const requestBody = {
            "start": tenDaysAgo.format('YYYY-MM-DD'),
            "end": eightDaysAgo.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start1).toBe(tenDaysAgo.format());
        expect(response.body.dates.start2).toBe(start2.format());
        expect(response.body.dates.end).toBe(eightDaysAgo.format());

        expect(response.body.satisfied1).toBe(4);
        expect(response.body.total1).toBe(3);
        expect(response.body.pourcent1).toBe(75);

        expect(response.body.satisfied2).toBe(0);
        expect(response.body.total2).toBe(0);
        expect(response.body.pourcent2).toBe(null);
        expect(response.body.delta).toBe(0);
    });

    test('zero satisfaction data', async () => {
        const now = moment.utc().startOf('day');
        const oneDayAgo = now.clone().subtract(1, 'days');

        const start2 = oneDayAgo.clone();
        start2.subtract(now.diff(oneDayAgo, 'days'), 'days');

        const requestBody = {
            "start": oneDayAgo.format('YYYY-MM-DD'),
            "end": now.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start1).toBe(oneDayAgo.format());
        expect(response.body.dates.start2).toBe(start2.format());
        expect(response.body.dates.end).toBe(now.format());

        expect(response.body.satisfied1).toBe(6);
        expect(response.body.total1).toBe(0);
        expect(response.body.pourcent1).toBe(0);

        expect(response.body.satisfied2).toBe(1);
        expect(response.body.total2).toBe(0);
        expect(response.body.pourcent2).toBe(0);
        expect(response.body.delta).toBe(0);
    });

    test("non-privileged user results in 401", async () => {

        const now = moment.utc().startOf('day');
        const oneDayAgo = now.clone().subtract(1, 'days');

        const start2 = oneDayAgo.clone();
        start2.subtract(now.diff(oneDayAgo, 'days'), 'days');

        const requestBody = {
            "start": oneDayAgo.format('YYYY-MM-DD'),
            "end": now.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.nonPrivilegedUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(401);
    });

    test("invalid start-date results in BAD_REQUEST", async () => {

        const now = moment.utc().startOf('day');
        const oneDayAgo = now.clone().subtract(1, 'days');

        const start2 = oneDayAgo.clone();
        start2.subtract(now.diff(oneDayAgo, 'days'), 'days');

        const requestBody = {
            "start": 'invalid date',
            "end": now.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
    });

    test("invalid end-date results in BAD_REQUEST", async () => {

        const now = moment.utc().startOf('day');
        const oneDayAgo = now.clone().subtract(1, 'days');

        const start2 = oneDayAgo.clone();
        start2.subtract(now.diff(oneDayAgo, 'days'), 'days');

        const requestBody = {
            "start": oneDayAgo.format('YYYY-MM-DD'),
            "end": 'invalid date'
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(400);
    });

    test('satisfaction data', async () => {
        const now = moment.utc().startOf('day');
        const tenDaysAgo = now.clone().subtract(10, 'days');

        const start2 = tenDaysAgo.clone();
        start2.subtract(now.diff(tenDaysAgo, 'days'), 'days');

        const requestBody = {
            "start": tenDaysAgo.format('YYYY-MM-DD'),
            "end": now.format('YYYY-MM-DD')
        };

        const response = await request(app).post('/api/v3/aggregate/responses').set('Authorization', `Bearer ${testData.adminUser.authToken}`).send(requestBody);
        expect(response.statusCode).toBe(200);
        expect(response.body.dates.start1).toBe(tenDaysAgo.format());
        expect(response.body.dates.start2).toBe(start2.format());
        expect(response.body.dates.end).toBe(now.format());

        expect(response.body.satisfied1).toBe(21);
        expect(response.body.total1).toBe(6);
        expect(response.body.pourcent1).toBe(28.57142857142857);

        expect(response.body.satisfied2).toBe(0);
        expect(response.body.total2).toBe(0);
        expect(response.body.pourcent2).toBe(null);
        expect(response.body.delta).toBe(0);
    });

});
