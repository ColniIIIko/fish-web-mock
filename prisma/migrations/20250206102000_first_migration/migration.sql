-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "report" (
    "id" UUID NOT NULL,
    "nickname" TEXT,
    "boat" TEXT,
    "landing" TEXT,
    "type" TEXT,
    "pictures" TEXT[],
    "userEmail" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "anglers" INTEGER,
    "conditions" INTEGER,
    "setup" TEXT,
    "report" TEXT,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "species" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "length" INTEGER,
    "weight" INTEGER,
    "attachments" TEXT[],

    CONSTRAINT "fish_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fish" ADD CONSTRAINT "fish_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
