import { PrismaClient } from "@prisma/client";
import { PostCategory } from "../app/types/post";
const prisma = new PrismaClient();

const organizations = [
  "Visit Seattle",
  "Visit Denver",
  "Visit Orlando",
  "NYC & Company",
  "Visit California",
  "Discover Hong Kong",
  "Tourism Australia",
  "Visit Britain",
  "Destination Canada",
  "Dubai Tourism",
];

const jobTitles = [
  "Director of Digital Marketing",
  "Marketing Manager",
  "Content Strategist",
  "Social Media Manager",
  "Tourism Development Officer",
  "Brand Manager",
  "Communications Director",
  "Marketing Coordinator",
  "Digital Content Producer",
  "Tourism Research Analyst",
];

const locations = [
  "Seattle, WA",
  "Denver, CO",
  "Orlando, FL",
  "New York, NY",
  "Los Angeles, CA",
  "Hong Kong",
  "Sydney, Australia",
  "London, UK",
  "Vancouver, Canada",
  "Dubai, UAE",
];

const thoughtLeadershipPosts = [
  "Just published our latest research on sustainable tourism trends. Key findings show that 73% of travelers are now prioritizing eco-friendly accommodations. This shift is reshaping how we approach destination marketing. #SustainableTourism",
  "The future of destination marketing lies in personalization. Our recent campaign using AI-driven content recommendations saw a 45% increase in engagement. Here's what we learned...",
  "Breaking down the impact of virtual reality in tourism marketing: From virtual city tours to immersive cultural experiences, here's how VR is transforming the way we showcase destinations.",
  "The power of storytelling in destination marketing: How we increased visitor engagement by 60% through authentic local narratives and user-generated content.",
  "Digital transformation in tourism: Our journey from traditional marketing to data-driven decision making. Key insights and lessons learned.",
];

const newsPosts = [
  "Excited to announce our new partnership with local artisans to showcase authentic cultural experiences to visitors! #LocalTourism",
  "Breaking: Our city just won the 'Best Cultural Destination 2024' award! Thank you to our amazing community for making this possible.",
  "Tourism numbers hit record high this quarter! 25% increase in international visitors compared to last year.",
  "Just launched our new mobile app featuring AR-powered city tours! Download now to explore hidden gems.",
  "Major infrastructure project announced: New sustainable tourism initiative to reduce our carbon footprint by 30% by 2025.",
];

const eventsPosts = [
  "Save the date! Our annual Food & Wine Festival returns next month. Early bird tickets available now. #FoodTourism",
  "Join us for the International Tourism Summit 2024! Industry leaders from 30+ countries will discuss the future of travel.",
  "Announcing our Winter Festival lineup! Three weeks of cultural performances, local cuisine, and winter sports activities.",
  "Tech in Tourism Conference 2024: Exploring AI, VR, and the future of travel. Registration now open!",
  "Cultural Heritage Week starts tomorrow! Free guided tours, workshops, and performances across the city.",
];

async function seed() {
  console.log("Cleaning up existing data...");
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users...");
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i + 1}@${organizations[i].toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        name: `${["Sarah", "Michael", "Emma", "David", "Lisa", "James", "Anna", "John", "Maria", "Robert"][i]} ${["Johnson", "Chen", "Rodriguez", "Smith", "Brown", "Wilson", "Lee", "Garcia", "Martinez", "Anderson"][i]}`,
        organization: organizations[i],
        jobTitle: jobTitles[i],
        location: locations[i],
        linkedIn: `https://linkedin.com/in/${["sarah-johnson", "michael-chen", "emma-rodriguez", "david-smith", "lisa-brown", "james-wilson", "anna-lee", "john-garcia", "maria-martinez", "robert-anderson"][i]}`,
      },
    });
    users.push(user);
  }

  console.log("Creating posts...");
  const categories = Object.values(PostCategory);
  const allPosts = [
    ...thoughtLeadershipPosts.map(content => ({ content, category: PostCategory.THOUGHT_LEADERSHIP })),
    ...newsPosts.map(content => ({ content, category: PostCategory.NEWS })),
    ...eventsPosts.map(content => ({ content, category: PostCategory.EVENTS })),
  ];

  // Create 5 posts for each remaining category
  for (const category of categories) {
    if (![PostCategory.THOUGHT_LEADERSHIP, PostCategory.NEWS, PostCategory.EVENTS].includes(category)) {
      for (let i = 0; i < 5; i++) {
        allPosts.push({
          content: `${category} post ${i + 1}: Sharing insights about ${category.toLowerCase()}. This is a sample post to demonstrate the content structure and formatting for this category.`,
          category,
        });
      }
    }
  }

  // Create all posts with random users and timestamps
  for (const post of allPosts) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomDays = Math.floor(Math.random() * 30); // Posts from last 30 days
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomDays);

    // Add images to 60% of posts
    const shouldHaveImage = Math.random() < 0.6;
    const imageId = Math.floor(Math.random() * 1000) + 1; // Random ID between 1 and 1000
    const imageWidth = 1200;
    const imageHeight = 800;

    await prisma.post.create({
      data: {
        content: post.content,
        category: post.category,
        userId: randomUser.id,
        createdAt,
        imageUrl: shouldHaveImage ? `https://picsum.photos/id/${imageId}/${imageWidth}/${imageHeight}` : null,
      },
    });
  }

  console.log("Database seeded!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
