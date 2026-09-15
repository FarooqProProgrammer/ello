import { db } from "./client";

export interface ScenarioInput {
  title: string;
  description: string;
}

export async function listScenarios(userId: string) {
  return db().customScenario.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true },
  });
}

export async function getScenario(userId: string, id: string) {
  return db().customScenario.findFirst({ where: { id, userId }, select: { id: true, title: true, description: true } });
}

export async function createScenario(userId: string, input: ScenarioInput) {
  return db().customScenario.create({
    data: { userId, title: input.title.trim(), description: input.description.trim() },
    select: { id: true, title: true, description: true },
  });
}

export async function updateScenario(userId: string, id: string, input: ScenarioInput) {
  const { count } = await db().customScenario.updateMany({
    where: { id, userId },
    data: { title: input.title.trim(), description: input.description.trim() },
  });
  return count > 0;
}

export async function deleteScenario(userId: string, id: string) {
  const { count } = await db().customScenario.deleteMany({ where: { id, userId } });
  return count > 0;
}
