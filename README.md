# ShopSphere — MERN e-commerce starter

Chosen defaults:
- Modern Amazon-inspired storefront
- Email + password authentication
- Demo checkout first; payment gateway can be integrated later
- React + Vite frontend, Express + MongoDB/Mongoose backend
- Guest browsing; login required to save cart/place orders

## Requirements
- Node.js 20+
- MongoDB Atlas URI or local MongoDB

## Setup

### 1. Backend
```bash
cd backend
copy .env.example .env
npm install
```
Edit `.env` and set `MONGODB_URI` and a long random `SESSION_SECRET`.
`SERVER_URL` must be the public address of this backend (default `http://localhost:5000`); it is used to build the links of photos uploaded from the Sell page.

> `npm install` is required again: this version adds the `multer` package for image uploads.

Start:
```bash
npm run dev
```
Backend runs at http://localhost:5000

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Seed sample products
Once the backend is running, run:
```bash
cd backend
npm run seed
```
This adds sample products to MongoDB.

## Features included
- Browse/search products and categories as a guest
- Product image gallery (sample products have 3 images)
- Sizes for clothing
- Register/login/logout using server-side sessions
- Profile page and editable bio
- Cart saved in MongoDB for signed-in users; guest cart kept in browser memory/localStorage
- Checkout with address and demo order confirmation
- Separate `customers`, `products`, `carts`, and `orders` collections
- Order history with status, order date, estimated delivery date and rating placeholder
- Backend recalculates prices from the database before order creation

## New in v2: selling products and live stock

### Sell a product from the browser
1. Log in, then click **Sell** in the top bar.
2. Fill in name, category, price, **quantity in stock**, optional sizes/variants (shown for Men's/Women's/Kids' Wear, Shoes, Sports and Electronics; numbers like 6, 7, 8 for shoes, 128GB, 256GB for phones/laptops; leave empty for TV, mixer, grinder), description, and add photos (upload files and/or paste image links, 1-8 total).
3. Press **List product**. It is saved in the `products` collection and appears in the storefront immediately.
4. The **Your listings** panel shows each product's live **In stock** and **Sold** numbers. You can add stock (`+N`), change the price, or delete a listing. Only the seller who created a product can change or delete it.

Uploaded photos are saved in `backend/uploads/` and served at `/uploads/...`; the link is stored in MongoDB.

### Stock and ordered quantity
- `products.stock` = units still available. `products.soldQty` = total units ordered.
- Placing an order for qty N does, in one atomic MongoDB update per product: `stock -= N`, `soldQty += N`, only if `stock >= N`.
  Two customers can never buy the same last unit. If any item fails or saving the order fails, the reserved stock is put back.
- The order itself (`orders` collection) stores each `productId`, `quantity`, price and size.
- Adding to cart / raising the cart quantity is limited to the stock in the database.
- Re-running `npm run seed` no longer resets stock or sold counts of existing products.

### API additions
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/products` | Add a product (multipart/form-data, login required) |
| GET | `/api/products/mine` | Your listings with stock and sold counts |
| PATCH | `/api/products/:id` | Owner only: `price`, `addStock` (adds to stock), `name`, `description` |
| DELETE | `/api/products/:id` | Owner only: remove listing (also removed from carts) |

### Bug fix
Checkout previously sent an undefined `deliveryAddress` variable, so placing an order failed. It now sends the address form correctly.

Refreshing the browser (or opening a direct link such as `/sell`, `/cart`, `/product/...`) used to send the user back to the Home page, because the search box reset itself on first load. It now resets only after the user has typed and cleared it.

## Important limitations
- Checkout is a DEMO and does not collect real money. Do not use it for real sales until a payment gateway is integrated and verified server-side.
- Shipping estimates are illustrative calendar-day estimates, not carrier-confirmed delivery dates.
- Product images use remote demo image URLs. Replace them with licensed assets / your own image hosting.
- For production, add CSRF protection, rate limiting, email verification/password reset, robust validation, monitoring, persistent session store, and a payment gateway.

## Online payment with Cashfree (v3)

Checkout now pays through Cashfree (UPI, cards, net banking).

1. Cashfree dashboard > Developers > API Keys: copy the **App ID** and **Secret Key** (test keys first).
2. In `backend/.env` set `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV=sandbox` (see `backend/.env.example`). Set the same variables on your host (for example Render). `CLIENT_URL` must be your real frontend address, because Cashfree sends the customer back there.
3. Restart the backend. Test with the sandbox test data: https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration

How it works:
- `POST /api/payments/checkout` checks the cart, reserves stock, creates a Cashfree order (price from the database) and returns a payment session.
- The customer pays on Cashfree, then returns to `/payment-status`.
- `POST /api/payments/verify` asks Cashfree for the real status. Only `PAID` marks the order Paid.
- Unpaid orders expire after 30 minutes and their stock is released automatically (background check every 5 minutes).
- `POST /api/orders` (free demo order) is disabled unless `ALLOW_DEMO_CHECKOUT=true`.
- Paid orders cannot be cancelled in the app yet (no refund flow). Use the Cashfree dashboard to refund.

Before going live: complete Cashfree activation, switch to `CASHFREE_ENV=production` with live keys, and add a webhook as a second safety net.
