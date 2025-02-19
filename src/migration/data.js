import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function importStores() {
  const stores = JSON.parse(fs.readFileSync("stores.json", "utf-8"));
  const categoriesList = ["phones", "pc", "video games"];
  const BATCH_SIZE = 20; // Adjust as needed

  for (let i = 0; i < stores.length; i += BATCH_SIZE) {
    const batch = stores.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (store) => {
      try {
        // Determine role
        let role = "STORE";
        const isWholesaler = store.wholesalers?.toLowerCase() === "yes";
        const isDistributor = store.distrbutors?.toLowerCase() === "yes";

        if (isWholesaler && isDistributor) {
          role = "ALL";
        } else if (isWholesaler) {
          role = "WHOLESALER";
        } else if (isDistributor) {
          role = "DISTRIBUTOR";
        }

        // Ensure categories exist
        const categoryIds = [];
        for (const categoryName of categoriesList) {
          if (store[categoryName]?.toLowerCase() === "yes") {
            const category = await prisma.category.upsert({
              where: { name: categoryName.toUpperCase() },
              update: {},
              create: { name: categoryName.toUpperCase() },
            });
            categoryIds.push(category.id);
          }
        }
        // If no user exists, create a new user
          const user = await prisma.user.create({
            data: {
              name: store.storeName || "Unknown Store",
              email: store.email || `${store.storeName}@gmail.com`,
              password: "defaultpassword", // Hash this in production
              role: "STORE",
            },
          });

        // Create the store
        const newStore = await prisma.store.create({
          data: {
            position: store.position || "owner",
            storeName: store.storeName,
            storeEmail: store.email || null,
            description: store.description || null,
            phoneNumber: store.phoneNumber || null,
            website: store.website || null,
            facebookPage: store.facebookPage || null,
            linkedinPage: store.linkedinPage || null,
            city: store.city,
            country: store.country,
            continent: "asia",
            isVerified:true,
            role: role,
            userId: user.id, // Associate the store with the existing or newly created user
          },
        });

        // Link store to categories
        await Promise.all(categoryIds.map(async (categoryId) => {
          await prisma.storeCategory.create({
            data: {
              storeId: newStore.id,
              categoryId: categoryId,
            },
          });
        }));

        console.log(`Store "${store.storeName}" imported ✅`);
      } catch (error) {
        console.error(`Error importing ${store.storeName}:`, error);
      }
    }));
  }

  console.log("All stores imported successfully ✅");
}

importStores().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
