const request = require('supertest');

//Набор интеграционных тестов
describe('API routes', () => {
    const base_url = 'http://172.21.0.3:3000';

    test('GET /ping should return online status', async () => {
        const res = await request(base_url).get('/ping');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({success: true, status: 'online'});
    });

    test('GET /accounts/:network/:currency/:type should return account', async () => {
        const res = await request(base_url).get('/accounts/TRC20/TRON/hot');
        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('success', true)
        expect(res.body).toHaveProperty('data')
    });

    //shasta мнемоники и ключи
    test('POST /keys/:network/:currency/:type', async () => {
        const res = await request(base_url).post('/keys/TRC20/USDTTRC20/hot')
        .send({
            mnemonic: 'axis until seven warrior wire best burger device trip sentence senior alter skirt swift nuclear novel disease city gadget erase satisfy surround hurt there',
            privateKey: '2D63700A2F368D54F17E133DB2170C57792D6CD8C3597572A26C2B3838738C98',
        });
        expect(res.body).toHaveProperty('success', true);
    });

    //shasta мнемоники и ключи
    test('POST /keys/unsafe/:network/:currency/:type should return success', async () => {
        const res = await request(base_url).post('/keys/unsafe/TRC20/USDTTRC20/hot')
        .send({
            mnemonic: 'axis until seven warrior wire best burger device trip sentence senior alter skirt swift nuclear novel disease city gadget erase satisfy surround hurt there',
            privateKey: '2D63700A2F368D54F17E133DB2170C57792D6CD8C3597572A26C2B3838738C98',
        });
        expect(res.body).toHaveProperty('success', true);
    });

    test('GET /keys/stored/:network/:currency/:type' , async () => {
        const res = await request(base_url).get('/keys/stored/TRC20/USDTTRC20/hot');
        expect(res.body).toHaveProperty('success', true);
    });

    test('POST /transactions/:network/:currency/:type', async () => {
        const res = await request(base_url).post('/transactions/TRC20/USDTTRC20/hot')
        .send({
            address: 'TJwsMhMemFJb3nNoT8NtJDSBV4o6TsKUCG', //Случайный shasta кошелёк
            amount: 1
        });
        expect(res.body).toHaveProperty('data.txid');
    });

    test('POST /balance/:network/:currency/:type', async () => {
        const res = await request(base_url).post('/balance/TRC20/USDTTRC20/hot')
        .send({
            address: "TJwsMhMemFJb3nNoT8NtJDSBV4o6TsKUCG",
        });
        expect(res.body).toHaveProperty('success', true);
    });

});
