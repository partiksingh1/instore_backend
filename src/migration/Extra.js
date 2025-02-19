import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const record = await prisma.user.deleteMany({
  where: { id: { gte: 1008 } },
});
console.log(record);
