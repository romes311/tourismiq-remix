import { PrismaClient, PostCategory } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  // Clean the database
  await db.comment.deleteMany();
  await db.like.deleteMany();
  await db.post.deleteMany();
  await db.follow.deleteMany();
  await db.user.deleteMany();

  console.log("🧹 Cleaned database...");

  console.log("👥 Created users...");
  // Create users
  const sarah = await db.user.create({
    data: {
      email: "sarah@visitseattle.org",
      name: "Sarah Johnson",
      organization: "Visit Seattle",
      jobTitle: "Director of Digital Marketing",
      location: "Seattle, WA",
      linkedIn: "https://linkedin.com/in/sarah-johnson",
    },
  });

  const michael = await db.user.create({
    data: {
      email: "michael@visitdenver.com",
      name: "Michael Chen",
      organization: "Visit Denver",
      jobTitle: "Marketing Manager",
      location: "Denver, CO",
      linkedIn: "https://linkedin.com/in/michael-chen",
    },
  });

  const emma = await db.user.create({
    data: {
      email: "emma@visitorlando.com",
      name: "Emma Rodriguez",
      organization: "Visit Orlando",
      jobTitle: "Content Strategist",
      location: "Orlando, FL",
      linkedIn: "https://linkedin.com/in/emma-rodriguez",
    },
  });

  console.log("📝 Created posts...");
  // Create posts
  await db.post.create({
    data: {
      content:
        "Excited to share our latest campaign highlighting Seattle's vibrant food scene! We've partnered with local chefs to showcase the unique flavors of the Pacific Northwest. #VisitSeattle #FoodTourism",
      category: PostCategory.THOUGHT_LEADERSHIP,
      userId: sarah.id,
    },
  });

  await db.post.create({
    data: {
      content:
        "Denver's winter tourism numbers are breaking records! Our strategic focus on outdoor adventures and urban experiences is paying off. Here's what we learned... #TourismMarketing #DMO",
      category: PostCategory.NEWS,
      userId: michael.id,
    },
  });

  await db.post.create({
    data: {
      content:
        "Just released our 2024 Visitor Guide! Check out the digital version for an immersive experience of Orlando's attractions. #VisitOrlando #TravelTech",
      category: PostCategory.NEWS,
      userId: emma.id,
    },
  });

  console.log("✅ Seed completed");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
