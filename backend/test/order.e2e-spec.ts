import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/modules/app/app.module';

describe('OrderController (e2e)', () => {
  let app: INestApplication;

  const mockRedis = {
    sadd: jest.fn(),
    rpop: jest.fn(),
    srem: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS_CLIENT')
      .useValue(mockRedis)
      .overrideProvider(getQueueToken('orders'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/orders/checkout (POST) - success', async () => {
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.rpop.mockResolvedValue('token-123');
    mockQueue.add.mockResolvedValue({ id: 'job-123' });

    return request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .send({
        flashSaleId: 1,
        userEmail: 'test@example.com',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.token).toBe('token-123');
        expect(res.body.jobId).toBe('job-123');
      });
  });

  it('/api/v1/orders/checkout (POST) - already purchased', async () => {
    mockRedis.sadd.mockResolvedValue(0);

    return request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .send({
        flashSaleId: 1,
        userEmail: 'test@example.com',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Already purchased this item');
      });
  });
});
