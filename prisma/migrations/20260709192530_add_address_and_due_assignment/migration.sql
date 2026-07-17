-- AlterTable
ALTER TABLE "units" ADD COLUMN     "address" TEXT;

-- CreateTable
CREATE TABLE "due_assignments" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "amount_kobo" INTEGER,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "due_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "due_assignments_collection_id_unit_id_key" ON "due_assignments"("collection_id", "unit_id");

-- AddForeignKey
ALTER TABLE "due_assignments" ADD CONSTRAINT "due_assignments_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "due_assignments" ADD CONSTRAINT "due_assignments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
