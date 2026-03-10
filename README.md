# Flash Sale Platform

This repo is to test flash sale condition and its handling

## System Architecture

![system architecture](docs/img/system-architecture.png)

The following stacks are chosen for this flash sale project:

- Backend: NestJS. Coming from Java Spring boot background, this is the closest Javascript framework similar to Spring Boot, which provides module system, dependency injection, and etc.
- Frontend: React and Tailwind CSS.
- Database: PostgreSQL
- Cache: Redis
- Message Queue: Redis

## Flow Diagram

![flow diagram](docs/img/flow-diagram.png)

## Tradeoff

## What should be implemented in production

## How to Run the project

### Prerequisites

- Docker
- Docker Compose

### Steps

1. Clone the repository
2. Run `docker-compose up -d`

## How to test the project

## How to stress test the project

1. Open the page for testing at `http://localhost:3000/test`
2. Add target selection to add new flash sale for existing item with custom available stock and duration
3. Select test parameters whether it distributed with email generation for number if request or burst mode with the same email
4. Click initiate sequence to simulate purchase
