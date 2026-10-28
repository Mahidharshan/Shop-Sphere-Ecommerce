import Product from "../models/Product.js";

// Put reserved stock back (used when an order or payment does not go through).
export async function releaseStock(items) {
  await Promise.all(items.map(i =>
    Product.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity, soldQty: -i.quantity } })
  ));
}

// Reserve stock one product at a time. Each step is atomic:
// "reduce stock and raise soldQty, but only if enough stock is left".
// If any item fails, everything reserved so far is put back.
export async function reserveStock(orderItems) {
  const reserved = [];
  for (const item of orderItems) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, soldQty: item.quantity } },
      { new: true }
    );
    if (!updated) {
      await releaseStock(reserved);
      return { ok: false, failedItem: item };
    }
    reserved.push(item);
  }
  return { ok: true };
}
