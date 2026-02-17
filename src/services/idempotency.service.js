import prisma from "../lib/prisma.js";

export async function isStatementProcessed(statementKey) {
    const existing = await prisma.processedStatement.findUnique({
        where: { statementKey },
    });

    return !!existing;
}

export async function markStatementProcessed(statementKey, bank) {
    await prisma.processedStatement.create({
        data: {
            statementKey,
            bank,
        },
    });
}