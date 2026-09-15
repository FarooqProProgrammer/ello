import { getCurrentUser } from "./users";
import { db } from "./client";

const starterVocab = [
  { term: "however", definition: "used to introduce a contrasting statement", example: "It was sunny; however, it was cold." },
  { term: "improve", definition: "to make or become better", example: "I want to improve my English." },
  { term: "confident", definition: "feeling sure about your abilities", example: "She feels confident speaking in meetings." },
];

async function main() {
  const user = await getCurrentUser();
  for (const word of starterVocab) {
    await db().vocabItem.upsert({
      where: { userId_term: { userId: user.id, term: word.term } },
      update: {},
      create: { ...word, userId: user.id, source: "seed" },
    });
  }
  console.log(`Seeded user "${user.id}" with ${starterVocab.length} starter words.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db().$disconnect());
