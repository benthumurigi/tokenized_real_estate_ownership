import { v4 as uuidv4 } from 'uuid';
import { Server, jsonStringify, StableBTreeMap, ic, nat64 } from 'azle';
import express from 'express';

/**
 * Represents a real estate property.
 */
class RealEstateProperty {
  id: string;
  address: string;
  owner: string;
  // List of tokenized ownership shares
  tokenizedShares: { [key: string]: number };
  // Array to store transaction history
  transactionHistory: string[];
  deedURL: string;
  createdAt: Date;
  updatedAt: Date | null;

  constructor(address: string, owner: string, deedURL: string) {
    this.id = uuidv4();
    this.address = address;
    this.owner = owner;
    this.tokenizedShares = { [owner]: 100 };
    this.transactionHistory = [`Property created by ${owner}`];
    this.deedURL = deedURL;
    this.createdAt = getCurrentDate();
    this.updatedAt = null;
  }

  updateOwnerAndShares(newOwner: string, newShares: number) {
    this.owner = newOwner;
    this.tokenizedShares = { [newOwner]: newShares };
  }

  transferShares(from: string, to: string, shares: number) {
    if (this.tokenizedShares[from] < shares) {
      throw new Error(`You do not own ${shares} shares in property ${this.id}`);
    }

    this.tokenizedShares[from] -= shares;
    this.tokenizedShares[to] = (this.tokenizedShares[to] || 0) + shares;

    this.transactionHistory.push(`${shares} transferred from ${from} to ${to}`);

    // Update ownership if necessary
    let newOwner = this.owner;
    let maxShares = 0;
    Object.entries(this.tokenizedShares).forEach(([name, value]) => {
      if (value > maxShares) {
        maxShares = value;
        newOwner = name;
      }
    });
    this.owner = newOwner;
  }
}

/**
 * Represents the users of this application
 */
class User {
  username: string;
  email: string;
  password: string;
  walletTokens: number;
}

const usersStorage = StableBTreeMap<string, User>(0);
const realEstatePropertiesStorage = StableBTreeMap<string, RealEstateProperty>(1);

export default Server(() => {
  const app = express();
  app.use(express.json());

  /**
   * Create a new user
   */
  app.post("/users", (req, res) => {
    const { username, email, password } = req.body;

    // Validate input
    if (usersStorage.has(username) || usersStorage.values().some((user) => user.email === email)) {
      return res.status(400).json(jsonStringify({ error: "User exists or email is already in use." }));
    }

    const user: User = { username, email, password, walletTokens: 0 };
    usersStorage.insert(username, user);
    res.json(jsonStringify(user));
  });

  /**
   * Deposit funds
   */
  app.post("/users/deposit", (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount || isNaN(amount)) {
      res.status(400).json(jsonStringify({ error: "Deposit amount must be specified and must be a number." }));
      return;
    }

    const user = usersStorage.get(username).Some;
    if (user) {
      user.walletTokens += amount;
      usersStorage.insert(username, user);
      res.json(user);
    } else {
      res.status(404).json(jsonStringify({ error: "User doesn't exist." }));
    }
  });

  /**
   * Create a new property
   */
  app.post("/properties", (req, res) => {
    const { address, owner, deedURL, shares } = req.body;

    // Validate input
    if (!address || !owner || !deedURL || !shares || isNaN(shares) || shares < 1) {
      return res.status(400).json(jsonStringify({ error: "Address, shares and deed url are required fields and shares must be a positive number greater than 0." }));
    }

    if (usersStorage.has(owner)) {
      const property = new RealEstateProperty(address, owner, deedURL);
      realEstatePropertiesStorage.insert(property.id, property);
      res.json(jsonStringify(property));
    } else {
      res.status(400).json(jsonStringify({ error: "Owner not registered as a user" }));
    }
  });

  /**
   * Get all properties
   */
  app.get("/properties", (req, res) => {
    res.json(jsonStringify(realEstatePropertiesStorage.values()));
  });

  /**
   * Get a specific property
   */
  app.get("/properties/:id", (req, res) => {
    const propertyId = req.params.id;

    // Validate input
    if (!propertyId) {
      return res.status(400).json(jsonStringify({ error: "A valid property id is required." }));
    }

    const property = realEstatePropertiesStorage.get(propertyId).Some;
    if (property) {
      res.json(jsonStringify(property));
    } else {
      res.status(404).json(jsonStringify({ error: `Property with ID=${propertyId} not found` }));
    }
  });

  /**
   * Update a property
   */
  app.put("/properties/:id", (req, res) => {
    const propertyId = req.params.id;

    // Validate input
    if (!propertyId) {
      return res.status(400).json(jsonStringify({ error: "A valid property id is required." }));
    }

    const { owner, address, deedURL } = req.body;

    // Validate input
    if (!owner || !address || !deedURL) {
      return res.status(400).json(jsonStringify({ error: "Address, owner and deedURL fields must be provided" }));
    }

    const property = realEstatePropertiesStorage.get(propertyId).Some;
    if (property) {
      if (property.owner !== owner && !usersStorage.has(owner)) {
        return res.status(400).json(jsonStringify({ error: `New owner not a registered user` }));
      }

      property.address = address;
      property.deedURL = deedURL;
      property.updatedAt = getCurrentDate();

      realEstatePropertiesStorage.insert(property.id, property);
      res.json(jsonStringify(property));
    } else {
      res.status(404).json(jsonStringify({ error: `Property with ID=${propertyId} not found` }));
    }
  });

  /**
   * Delete a property
   */
  app.delete("/properties/:id", (req, res) => {
    const propertyId = req.params.id;

    // Validate input
    if (!propertyId) {
      return res.status(400).json(jsonStringify({ error: "A valid property id is required." }));
    }

    const { username } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json(jsonStringify({ error: "Username field must be provided" }));
    }

    const property = realEstatePropertiesStorage.get(propertyId).Some;
    if (property) {
      if (property.owner !== username || Object.keys(property.tokenizedShares).length > 1) {
        return res.status(400).json(jsonStringify({ error: `Only owners of the property can delete it, and a property cannot be deleted if it has more than 1 shareholder.` }));
      }

      realEstatePropertiesStorage.remove(propertyId);
      res.json(jsonStringify(property));
    } else {
      res.status(404).json(jsonStringify({ error: `Property with ID=${propertyId} not found` }));
    }
  });

  /**
   * Transfer shares of a property and ownership if necessary.
   */
  app.post("/transfer/:id", (req, res) => {
    const propertyId = req.params.id;

    // Validate input
    if (!propertyId) {
      return res.status(400).json(jsonStringify({ error: "A valid property id is required." }));
    }

    const { from, to, shares } = req.body;

    // Validate input
    if (!from || !to || !shares || isNaN(shares) || shares <= 0) {
      return res.status(400).json(jsonStringify({ error: "Invalid input. 'from', 'to' and 'shares' are required fields, and 'shares' must be a positive number" }));
    }

    const property = realEstatePropertiesStorage.get(propertyId).Some;
    if (property) {
      try {
        property.transferShares(from, to, shares);
        realEstatePropertiesStorage.insert(property.id, property);
        res.json(jsonStringify(property));
      } catch (error) {
        res.status(400).json(jsonStringify({ error: error.message }));
      }
    } else {
      res.status(404).json(jsonStringify({ error: `Property with ID=${propertyId} not found` }));
    }
  });

  return app.listen();
});

/**
 * Gets the current date.
 * @returns the current date.
 */
function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}