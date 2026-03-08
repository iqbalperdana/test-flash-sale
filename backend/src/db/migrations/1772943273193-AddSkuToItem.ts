import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuToItem1772943273193 implements MigrationInterface {
  name = 'AddSkuToItem1772943273193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "item" ADD "sku" character varying`);
    await queryRunner.query(
      `UPDATE "item" SET "sku" = 'SKU-' || id WHERE "sku" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "item" ALTER COLUMN "sku" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "item" ADD CONSTRAINT "UQ_04b4bcce1bb7609fc226ce8c6c6" UNIQUE ("sku")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item" DROP CONSTRAINT "UQ_04b4bcce1bb7609fc226ce8c6c6"`,
    );
    await queryRunner.query(`ALTER TABLE "item" DROP COLUMN "sku"`);
  }
}
