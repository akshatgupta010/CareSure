import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function saveAuditBatch(results, rulesVersion) {
  return prisma.$transaction(
    results
      .filter((r) => r.claim_id)
      .map((r) =>
        prisma.claim.upsert({
          where: {
            claimId_patientId_encounterId: {
              claimId: r.claim_id,
              patientId: r.patient_id,
              encounterId: r.encounter_id,
            },
          },
          create: {
            claimId: r.claim_id,
            patientId: r.patient_id,
            encounterId: r.encounter_id,
            audits: {
              create: {
                riskLevel: r.risk_level.toUpperCase(),
                status: r.status,
                findings: r.discrepancies,
                rulesVersion,
              },
            },
          },
          update: {
            audits: {
              create: {
                riskLevel: r.risk_level.toUpperCase(),
                status: r.status,
                findings: r.discrepancies,
                rulesVersion,
              },
            },
          },
        })
      )
  );
}