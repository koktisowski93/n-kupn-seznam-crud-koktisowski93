const express = require("express");
const { body, param, validationResult } = require("express-validator");
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

// Mock Database
let shoppingLists = [
    {
        id: "test123",
        name: "Test List",
        products: [{ id: "banana1", solved: false }],
        invited: ["user1"],
        owner: "user123",
        archived: false
    }
];

let users = [{ id: "user123", email: "test@email.com", name: "Test User" }];
let products = [{ id: "banana1", name: "Banán" }];

// Middleware for role-based access control
const authorize = (roles) => (req, res, next) => {
    const { role } = req.headers;
    if (!roles.includes(role)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    next();
};

// Create Shopping List
app.post("/shoppingList/create", [
    body("name").isString(),
    body("owner").isString()
], authorize(["Admin", "Owner", "User"]), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, owner } = req.body;
    const existingList = shoppingLists.find(list => list.name === name);
    if (existingList) {
        return res.status(400).json({ error: "Shopping list with this name already exists" });
    }
    const newList = {
        id: Date.now(),
        name,
        owner,
        products: [],
        invited: [],
        archived: false
    };
    shoppingLists.push(newList);
    res.json(newList);
});

// Delete Shopping List
app.delete("/shoppingList/delete", [
    body("id").isString()
], authorize(["Admin", "Owner"]), (req, res) => {
    const { id } = req.body;
    shoppingLists = shoppingLists.filter(list => list.id !== id);
    res.json({ status: "success" });
});

// Invite to Shopping List
app.put("/shoppingList/invite", [
    body("shoppingListId").isString(),
    body("invited").isArray()
], authorize(["Admin", "Owner"]), (req, res) => {
    const { shoppingListId, invited } = req.body;
    const list = shoppingLists.find(l => l.id === shoppingListId);
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    list.invited.push(...invited);
    res.json(list);
});

// Display Shopping List
app.get("/shoppingList/get/:id", [
    param("id").isString()
], authorize(["Admin", "Owner", "Invited"]), (req, res) => {
    const list = shoppingLists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    res.json(list);
});

// Add to Shopping List
app.post("/shoppingList/post", [
    body("shoppingListId").isString(),
    body("product").isObject()
], authorize(["Admin", "Owner", "Invited"]), (req, res) => {
    const { shoppingListId, product } = req.body;
    const list = shoppingLists.find(l => l.id === shoppingListId);
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    list.products.push(product);
    res.json({ products: list.products });
});


// Display Products
app.get("/products/get", authorize(["Admin", "Owner", "Invited", "User"]), (req, res) => {
    res.json({ products });
});

// Tag "Solved"
app.post("/shoppingList/tag", [
    body("shoppingListId").isString(),
    body("productId").isString(),
    body("solved").isBoolean()
], authorize(["Admin", "Owner", "Invited"]), (req, res) => {
    const { shoppingListId, productId, solved } = req.body;
    const list = shoppingLists.find(l => l.id === shoppingListId);
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    const product = list.products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    product.solved = solved;
    res.json(list);
});

// List of Shopping Lists
app.get("/listOfLists/get/:userId", [
    param("userId").isString()
], authorize(["Admin", "Owner", "Invited"]), (req, res) => {
    const { userId } = req.params;
    const userLists = shoppingLists.filter(list => list.owner === userId || list.invited.includes(userId));
    res.json({ shoppingLists: userLists });
});

// Remove from Shopping List
app.delete("/shoppingList/removeProduct", [
    body("shoppingListId").isString(),
    body("productId").isString()
], authorize(["Admin", "Owner", "Invited"]), (req, res) => {
    const { shoppingListId, productId } = req.body;
    const list = shoppingLists.find(l => l.id === shoppingListId);

    if (!list) {
        return res.status(404).json({ error: "Shopping list not found" });
    }

    const initialLength = list.products.length;
    list.products = list.products.filter(p => p.id !== productId);

    if (list.products.length === initialLength) {
        return res.status(404).json({ error: "Product not found in shopping list" });
    }

    res.json(list);
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
