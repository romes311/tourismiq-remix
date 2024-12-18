import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  // Clean the database
  await db.like.deleteMany();
  await db.comment.deleteMany();
  await db.post.deleteMany();
  await db.follow.deleteMany();
  await db.user.deleteMany();

  console.log("🧹 Cleaned database...");

  // Create users
  const users = await Promise.all([
    db.user.create({
      data: {
        email: "sarah.johnson@visitseattle.org",
        name: "Sarah Johnson",
        organization: "Visit Seattle",
        bio: "Director of Sustainable Tourism at Visit Seattle. Passionate about eco-friendly travel initiatives.",
      },
    }),
    db.user.create({
      data: {
        email: "michael.chen@tourismvancouver.com",
        name: "Michael Chen",
        organization: "Tourism Vancouver",
        bio: "Digital Marketing Manager at Tourism Vancouver. Focused on innovative destination marketing.",
      },
    }),
    db.user.create({
      data: {
        email: "emma.brown@visitlondon.com",
        name: "Emma Brown",
        organization: "Visit London",
        bio: "Head of Tourism Development at Visit London. Specialist in cultural tourism.",
      },
    }),
    db.user.create({
      data: {
        email: "carlos.rodriguez@visitmadrid.com",
        name: "Carlos Rodriguez",
        organization: "Visit Madrid",
        bio: "Tourism Strategy Director at Visit Madrid. Expert in cultural heritage tourism.",
      },
    }),
    db.user.create({
      data: {
        email: "julia.schmidt@visitberlin.de",
        name: "Julia Schmidt",
        organization: "Visit Berlin",
        bio: "Head of Digital Innovation at Visit Berlin. Focused on smart tourism solutions.",
      },
    }),
  ]);

  console.log("👥 Created users...");

  // Create posts
  const posts = await Promise.all([
    // Sarah's posts
    db.post.create({
      data: {
        content:
          "Excited to announce our new sustainable tourism initiative! We're partnering with local businesses to reduce the environmental impact of tourism while enhancing visitor experiences. #SustainableTourism #VisitSeattle",
        authorId: users[0].id,
        hashtags: ["SustainableTourism", "VisitSeattle"],
      },
    }),
    db.post.create({
      data: {
        content:
          "New data shows 85% of Seattle visitors are interested in eco-friendly tourism options. We're on the right track with our green initiatives! 🌱 #TourismTrends #Sustainability",
        authorId: users[0].id,
        hashtags: ["TourismTrends", "Sustainability"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Join us next month for Seattle's first Sustainable Tourism Summit! Industry leaders will discuss the future of responsible travel. Register now at sustainableseattle.com #TourismSummit",
        authorId: users[0].id,
        hashtags: ["TourismSummit", "SustainableTourism"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Celebrating our local food scene! Seattle's farm-to-table restaurants are leading the way in sustainable culinary tourism. 🍽️ #CulinaryTourism #LocalFood",
        authorId: users[0].id,
        hashtags: ["CulinaryTourism", "LocalFood"],
      },
    }),

    // Michael's posts
    db.post.create({
      data: {
        content:
          "Just wrapped up our quarterly tourism industry meetup! Great insights on post-pandemic recovery strategies. Key takeaway: digital transformation is no longer optional. #TourismIndustry #DigitalTransformation",
        authorId: users[1].id,
        hashtags: ["TourismIndustry", "DigitalTransformation"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Vancouver's new virtual reality city tours are live! Experience our beautiful city from anywhere in the world. 🌎 #VirtualTourism #TravelTech",
        authorId: users[1].id,
        hashtags: ["VirtualTourism", "TravelTech"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Our AI-powered tourist information chatbot handled 50,000 queries last month with a 95% satisfaction rate! #TourismInnovation #AI",
        authorId: users[1].id,
        hashtags: ["TourismInnovation", "AI"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Launching our new mobile app for Vancouver visitors today! Real-time updates, personalized recommendations, and augmented reality features. #TravelApp #TourismTech",
        authorId: users[1].id,
        hashtags: ["TravelApp", "TourismTech"],
      },
    }),

    // Emma's posts
    db.post.create({
      data: {
        content:
          "London's tourism numbers are soaring! Q3 showed a 25% increase in international visitors compared to last year. Our new cultural initiatives are really paying off. #LondonTourism #CulturalTourism",
        authorId: users[2].id,
        hashtags: ["LondonTourism", "CulturalTourism"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Excited to launch London's new Heritage Trail app! Discover hidden gems and historical stories across the city. 🏛️ #DigitalTourism #Heritage",
        authorId: users[2].id,
        hashtags: ["DigitalTourism", "Heritage"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Our latest visitor survey shows museums and theaters are the top attractions in London. Arts and culture continue to drive tourism growth! 🎭 #CulturalTourism",
        authorId: users[2].id,
        hashtags: ["CulturalTourism", "LondonArts"],
      },
    }),
    db.post.create({
      data: {
        content:
          "New initiative: Free guided tours of London's historic neighborhoods every weekend. Supporting local tourism while preserving our heritage. #LocalTourism #History",
        authorId: users[2].id,
        hashtags: ["LocalTourism", "History"],
      },
    }),

    // Carlos's posts
    db.post.create({
      data: {
        content:
          "Madrid's new night tourism program is a huge success! Extended museum hours and cultural events are creating unforgettable experiences. 🌙 #NightTourism #Madrid",
        authorId: users[3].id,
        hashtags: ["NightTourism", "Madrid"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Proud to announce Madrid's selection as European Capital of Smart Tourism 2024! Our investments in digital infrastructure are being recognized. #SmartTourism",
        authorId: users[3].id,
        hashtags: ["SmartTourism", "Madrid2024"],
      },
    }),
    db.post.create({
      data: {
        content:
          "New data shows our gastronomy tours are bringing record numbers of foodies to Madrid. Spanish cuisine continues to be a major tourism driver! 🥘 #FoodTourism",
        authorId: users[3].id,
        hashtags: ["FoodTourism", "SpanishCuisine"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Launching sustainable tourism guidelines for Madrid's historic center. Balancing preservation with tourism growth. #HeritagePreservation",
        authorId: users[3].id,
        hashtags: ["HeritagePreservation", "SustainableTourism"],
      },
    }),

    // Julia's posts
    db.post.create({
      data: {
        content:
          "Berlin's new tourism app with AR features has reached 100K downloads! Visitors love the interactive street art tours. 📱 #TravelTech #StreetArt",
        authorId: users[4].id,
        hashtags: ["TravelTech", "StreetArt"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Our digital visitor cards now include public transport, museums, and bike sharing. Making sustainable tourism easier! 🚲 #SmartMobility",
        authorId: users[4].id,
        hashtags: ["SmartMobility", "SustainableTravel"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Excited about our new partnership with local tech startups to develop innovative tourism solutions. Berlin is becoming a smart tourism hub! #Innovation",
        authorId: users[4].id,
        hashtags: ["Innovation", "SmartTourism"],
      },
    }),
    db.post.create({
      data: {
        content:
          "Virtual reality tours of the Berlin Wall are now available in 10 languages! Making history accessible to everyone. 🎯 #DigitalHeritage",
        authorId: users[4].id,
        hashtags: ["DigitalHeritage", "VirtualTours"],
      },
    }),
  ]);

  console.log("📝 Created posts...");

  // Create some likes
  await Promise.all([
    db.like.create({
      data: {
        userId: users[1].id,
        postId: posts[0].id,
      },
    }),
    db.like.create({
      data: {
        userId: users[2].id,
        postId: posts[0].id,
      },
    }),
    db.like.create({
      data: {
        userId: users[0].id,
        postId: posts[1].id,
      },
    }),
  ]);

  console.log("👍 Created likes...");

  // Create some comments
  await Promise.all([
    db.comment.create({
      data: {
        content:
          "This is fantastic! Would love to learn more about your initiatives.",
        userId: users[1].id,
        postId: posts[0].id,
      },
    }),
    db.comment.create({
      data: {
        content:
          "Great insights! Digital transformation has been key to our success as well.",
        userId: users[2].id,
        postId: posts[1].id,
      },
    }),
  ]);

  console.log("💬 Created comments...");

  // Create some follows
  await Promise.all([
    db.follow.create({
      data: {
        followerId: users[1].id,
        followingId: users[0].id,
      },
    }),
    db.follow.create({
      data: {
        followerId: users[2].id,
        followingId: users[0].id,
      },
    }),
  ]);

  console.log("🤝 Created follows...");

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
