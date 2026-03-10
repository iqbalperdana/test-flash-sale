import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1772859792957 implements MigrationInterface {
  name = 'InitialSchema1772859792957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "order" (
            "id" BIGSERIAL NOT NULL, 
            "user_email" character varying NOT NULL, 
            "total_amount" numeric(10,2) NOT NULL, 
            "status" character varying NOT NULL DEFAULT 'PENDING', 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "item" (
            "id" BIGSERIAL NOT NULL, 
            "title" character varying NOT NULL, 
            "description" character varying, 
            "price" numeric(10,2) NOT NULL, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_d3c0c71f23e7adcf952a1d13423" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" (
            "id" BIGSERIAL NOT NULL, 
            "flash_sale_id" bigint, 
            "quantity" integer NOT NULL DEFAULT '1', 
            "price" numeric(10,2) NOT NULL, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "order_id" bigint, 
            "item_id" bigint, 
            CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "flash_sale" (
            "id" BIGSERIAL NOT NULL, 
            "name" character varying NOT NULL, 
            "start_time" TIMESTAMP NOT NULL, 
            "end_time" TIMESTAMP NOT NULL, 
            "allocated_stock" integer NOT NULL DEFAULT '0', 
            "available_stock" integer NOT NULL DEFAULT '0', 
            "max_purchase_qty" integer NOT NULL DEFAULT '1', 
            "is_active" boolean NOT NULL DEFAULT true, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "item_id" bigint, 
            CONSTRAINT "PK_0ca3636f18f85dce0d2b800a7fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" 
      ADD CONSTRAINT "FK_e9674a6053adbaa1057848cddfa" 
      FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" 
      ADD CONSTRAINT "FK_f9129a798f2308714d1e3be2463" 
      FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "flash_sale" ADD CONSTRAINT "FK_2ac37fab8feb8cdb1a2d5649651" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "flash_sale" DROP CONSTRAINT "FK_2ac37fab8feb8cdb1a2d5649651"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_f9129a798f2308714d1e3be2463"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_e9674a6053adbaa1057848cddfa"`,
    );
    await queryRunner.query(`DROP TABLE "flash_sale"`);
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TABLE "item"`);
    await queryRunner.query(`DROP TABLE "order"`);
  }
}
