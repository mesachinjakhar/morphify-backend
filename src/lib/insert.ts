import { prisma } from "./prisma";

const insert = async () => {
  await prisma.model.create({
    data: {
      name: "sachin jakhar",
      type: "MAN",
      age: 22,
      ethnicity: "BLACK",
      eyeColor: "BLACK",
      bald: true,
      userId: "1f0ecd73-70e5-4e55-ad10-b5ccf9ff4679",
      falAiRequestId: "1f0ecd73-70e5-4e55-ad10-b5ccf9ff4679",
      zipUrl: "1f0ecd73-70e5-4e55-ad10-b5ccf9ff4679",
    },
  });
};

insert();
