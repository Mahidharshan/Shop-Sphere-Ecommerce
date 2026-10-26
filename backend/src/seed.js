import "dotenv/config";
import { connectDatabase } from "./config/database.js";
import Product from "./models/Product.js";

const products = [
  {
    name: "Everyday Cotton Shirt", category: "Men's Wear",
    description: "A breathable cotton shirt designed for everyday comfort.",
    price: 799, currency: "INR", sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    stock: 30, sellerName: "North Street Apparel", averageRating: 4.5, reviewCount: 124,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900",
      "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=900",
      "https://images.unsplash.com/photo-1620012253295-c15a3e9c6f14?w=900"
    ]
  },
  {
    name: "Classic White Sneakers", category: "Shoes",
    description: "Minimal everyday sneakers with a cushioned sole.",
    price: 1499, currency: "INR", sizes: ["6", "7", "8", "9", "10", "11"],
    stock: 22, sellerName: "Stride Studio", averageRating: 4.4, reviewCount: 89,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&sat=-80",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900"
    ]
  },
  {
    name: "Everyday Tote Bag", category: "Accessories",
    description: "A versatile carry-all tote for work, study, and weekends.",
    price: 599, currency: "INR", sizes: [],
    stock: 40, sellerName: "Carry Collective", averageRating: 4.7, reviewCount: 56,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900"
    ]
  },
  {
    name: "Kids Casual Hoodie", category: "Kids' Wear",
    description: "A soft, easy-to-layer hoodie for everyday adventures.",
    price: 899, currency: "INR", sizes: ["XS", "S", "M", "L", "XL"],
    stock: 18, sellerName: "Little Day", averageRating: 4.6, reviewCount: 38,
    images: [
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900",
      "https://images.unsplash.com/photo-1503919005314-30d93d07d823?w=900",
      "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=900"
    ]
  },
  {
    name: "Training Sports Bottle", category: "Sports",
    description: "Reusable bottle for gym sessions, travel, and daily hydration.",
    price: 349, currency: "INR", sizes: [],
    stock: 65, sellerName: "Active Goods", averageRating: 4.3, reviewCount: 71,
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900"
    ]
  },
  {
    name: "Women's Everyday Jacket", category: "Women's Wear",
    description: "A clean, versatile layer for changing weather.",
    price: 1899, currency: "INR", sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    stock: 15, sellerName: "North Street Apparel", averageRating: 4.5, reviewCount: 93,
    images: [
      "https://images.unsplash.com/photo-1548624149-f0a7f1e6f3f4?w=900",
      "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=900",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900"
    ]
  }
];

await connectDatabase();
for (const product of products) {
  // stock and soldQty are only written when a product is first created, so running the seed again
  // never resets the live inventory that orders have been changing.
  const { stock, ...details } = product;
  await Product.updateOne(
    { name: product.name },
    { $set: details, $setOnInsert: { stock, soldQty: 0 } },
    { upsert: true, runValidators: true }
  );
}
console.log(`Seeded ${products.length} sample products.`);
process.exit(0);
