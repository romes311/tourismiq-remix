import { PrismaClient, PostCategory } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  console.log("🧹 Cleaned database...");
  // Clean the database
  await db.comment.deleteMany();
  await db.like.deleteMany();
  await db.post.deleteMany();
  await db.user.deleteMany();

  console.log("👥 Created users...");
  // Create users
  const sarah = await db.user.create({
    data: {
      email: "sarah@visitseattle.org",
      name: "Sarah Johnson",
      organization: "Visit Seattle",
      bio: "Director of Digital Marketing at Visit Seattle. Passionate about showcasing the best of the Pacific Northwest.",
    },
  });

  const michael = await db.user.create({
    data: {
      email: "michael@visitorlando.com",
      name: "Michael Chen",
      organization: "Visit Orlando",
      bio: "Tourism Development Manager at Visit Orlando. Theme park enthusiast and hospitality professional.",
    },
  });

  const emma = await db.user.create({
    data: {
      email: "emma@visitlondon.com",
      name: "Emma Thompson",
      organization: "Visit London",
      bio: "Head of Content Strategy at Visit London. Culture and history buff, always exploring hidden gems.",
    },
  });

  // Create posts
  const posts = await Promise.all([
    // Sarah's posts
    db.post.create({
      data: {
        content:
          "Excited to announce our new sustainable tourism initiative! We're partnering with local businesses to reduce the environmental impact of tourism while enhancing visitor experiences. #SustainableTourism #VisitSeattle",
        userId: sarah.id,
        category: PostCategory.NEWS,
        hashtags: ["SustainableTourism", "VisitSeattle"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Just published our latest case study on the impact of digital marketing campaigns on tourist engagement. Some fascinating insights on social media's role in destination marketing. #TourismMarketing #DMO",
        userId: sarah.id,
        category: PostCategory.CASE_STUDIES,
        hashtags: ["TourismMarketing", "DMO"],
      },
    }),

    // Michael's posts
    db.post.create({
      data: {
        content:
          "Join us next month for our annual Tourism Innovation Summit! We'll be discussing the future of theme park experiences and sustainable tourism practices. #TourismInnovation #VisitOrlando",
        userId: michael.id,
        category: PostCategory.EVENTS,
        hashtags: ["TourismInnovation", "VisitOrlando"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Check out our new video series showcasing Orlando's hidden gems beyond the theme parks. First episode features local artisans and food markets! #BeyondTheParks #LocalOrlando",
        userId: michael.id,
        category: PostCategory.VIDEOS,
        hashtags: ["BeyondTheParks", "LocalOrlando"],
      },
    }),

    // Emma's posts
    db.post.create({
      data: {
        content:
          "Sharing our latest whitepaper on post-pandemic tourism recovery strategies. Great insights from our team and industry partners. #TourismRecovery #LondonTourism",
        userId: emma.id,
        category: PostCategory.WHITEPAPERS,
        hashtags: ["TourismRecovery", "LondonTourism"],
      },
    }),
    db.post.create({
      data: {
        content:
          "New blog post: '10 Hidden Historical Sites in London'. Discover the lesser-known stories of our city. #SecretLondon #HistoricalSites",
        userId: emma.id,
        category: PostCategory.BLOG_POST,
        hashtags: ["SecretLondon", "HistoricalSites"],
      },
    }),
  ]);

  // Create some likes
  await Promise.all([
    db.like.create({
      data: {
        userId: michael.id,
        postId: posts[0].id,
      },
    }),
    db.like.create({
      data: {
        userId: emma.id,
        postId: posts[0].id,
      },
    }),
    db.like.create({
      data: {
        userId: sarah.id,
        postId: posts[2].id,
      },
    }),
    db.like.create({
      data: {
        userId: emma.id,
        postId: posts[2].id,
      },
    }),
  ]);

  // Create some comments
  await Promise.all([
    db.comment.create({
      data: {
        content:
          "This is fantastic! Would love to collaborate on similar initiatives.",
        userId: michael.id,
        postId: posts[0].id,
      },
    }),
    db.comment.create({
      data: {
        content:
          "Great insights! Looking forward to implementing some of these strategies.",
        userId: emma.id,
        postId: posts[1].id,
      },
    }),
  ]);

  console.log("✅ Database has been seeded");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
