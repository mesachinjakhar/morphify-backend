// Node.js script to insert PhotoAI packs using Prisma
import { prisma } from "./prisma";

async function main() {
  const packs = [
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile. First you create an AI model of yourself, and then you can generate endless AI photos that look just like you.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Hinge",
      description:
        "Hinge is about authenticity and real conversations. Capture moments that reflect who you are—whether you're relaxing with friends, exploring a new spot, or indulging in your hobbies—and showcase your true personality to spark deeper connections.",
      thumbnail: "<THUMBNAIL_URL>",
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"],
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    {
      name: "Tinder",
      description:
        "Look your best while staying true to who you are. Take photos with a variety of poses, playful expressions, and vibrant colors to make your dating profile stand out. Attract more matches on apps like Tinder, Bumble, and Hinge by showcasing your unique personality and style, helping you create a more engaging and appealing profile.",
      thumbnail: "<THUMBNAIL_URL>", // TODO: provide thumbnail URL or path
      gallery: ["<GALLERY_URL1>", "<GALLERY_URL2>"], // TODO: provide gallery image URLs
    },
    // ... include additional pack objects with their names and descriptions ...
  ];

  for (const pack of packs) {
    await prisma.packs.create({ data: pack });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
