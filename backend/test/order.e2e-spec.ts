import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { OrderService } from '../src/modules/order/order.service';
import { AppModule } from './../src/modules/app/app.module';

describe('OrderController (e2e)', () => {
  let app: INestApplication;

  const mockOrderService = {
    checkout: jest.fn(),
    getJobStatus: jest.fn(),
    findPendingOrders: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updatePaymentStatus: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrderService)
      .useValue(mockOrderService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/orders/checkout (POST) - success', async () => {
    mockOrderService.checkout.mockResolvedValue({
      token: 'token-123',
      jobId: 'job-123',
      message: 'Spot secured!',
    });

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
    mockOrderService.checkout.mockImplementation(() => {
      throw new BadRequestException('Already purchased this item');
    });

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

  it('/api/v1/orders/checkout (POST) - sold out', async () => {
    mockOrderService.checkout.mockImplementation(() => {
      throw new BadRequestException('Sold out');
    });

    return request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .send({
        flashSaleId: 1,
        userEmail: 'test@example.com',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Sold out');
      });
  });

  it('/api/v1/orders/status/:jobId (GET) - success', async () => {
    mockOrderService.getJobStatus.mockResolvedValue({
      status: 'completed',
      result: { success: true, orderId: 10 },
    });

    return request(app.getHttpServer())
      .get('/api/v1/orders/status/job-123')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('completed');
        expect(res.body.result.orderId).toBe(10);
      });
  });

  it('/api/v1/orders/status/:jobId (GET) - not found', async () => {
    mockOrderService.getJobStatus.mockImplementation(() => {
      throw new NotFoundException('Job not found');
    });

    return request(app.getHttpServer())
      .get('/api/v1/orders/status/invalid-job')
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Job not found');
      });
  });
});
