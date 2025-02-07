/*
  Warnings:

  - You are about to drop the column `count` on the `fish` table. All the data in the column will be lost.
  - Added the required column `caught` to the `fish` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fish" DROP COLUMN "count",
ADD COLUMN     "caught" INTEGER NOT NULL;
