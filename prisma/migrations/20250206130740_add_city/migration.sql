/*
  Warnings:

  - Added the required column `city` to the `report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "report" ADD COLUMN     "city" TEXT NOT NULL;
