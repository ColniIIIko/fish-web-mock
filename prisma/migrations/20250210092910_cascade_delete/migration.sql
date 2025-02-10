-- DropForeignKey
ALTER TABLE "fish" DROP CONSTRAINT "fish_report_id_fkey";

-- AddForeignKey
ALTER TABLE "fish" ADD CONSTRAINT "fish_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
