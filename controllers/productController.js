const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");

// @desc    Get all active products (public)
// @route   GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Get all products including inactive (admin)
// @route   GET /api/products/admin
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Get single product
// @route   GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

// @desc    Create a product
// @route   POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, image, milkType, packSizes, subscriptionAvailable } = req.body;

  if (!name || !packSizes || !Array.isArray(packSizes) || packSizes.length === 0) {
    res.status(400);
    throw new Error("name and at least one packSize (size + price) are required");
  }

  const product = await Product.create({
    name,
    description,
    image,
    milkType,
    packSizes,
    subscriptionAvailable,
  });

  res.status(201).json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const fields = ["name", "description", "image", "milkType", "packSizes", "subscriptionAvailable", "isActive"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  await product.save();
  res.json(product);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();
  res.json({ message: "Product deleted" });
});

module.exports = {
  getProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
