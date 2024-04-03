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
   tokenizedShares: string[];
   // Array to store transaction history
   transactionHistory: string[];
   deedURL: string;
   createdAt: Date;
   updatedAt: Date | null;

   constructor(address: string, owner: string, deedURL: string) {
      this.id = uuidv4();
      this.address = address;
      this.owner = owner;
      this.tokenizedShares = [];
      this.transactionHistory = [];
      this.deedURL = deedURL;
      this.createdAt = getCurrentDate();
      this.updatedAt = null;
   }
}

/**
 * Represents the users of this application
 */
class User {
   username: string;
   email: string;
   password: string;
   walletTokens: any;
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
      if (!("None" in usersStorage.get(username)) || usersStorage.values().some((user) => user.email === email)) {
         return res.status(400).json(jsonStringify({ error: "user exists or email is already in use." }));
      }

      const user: User = {username, email, password, walletTokens: "0"};
      usersStorage.insert(username, user);
      res.json(jsonStringify(user));
   });
   
   /**
    * Deposit funds
    */
   app.post("/users/deposit", (req, res) => {
      const { username, amount } = req.body;

      if(!username || !amount || isNaN(amount)){
         res.status(404).json(jsonStringify({error: "Deposit amount must be specified and must be a number."}));
         return;
      }

      const user = usersStorage.get(username).Some;
      if(user){
         user.walletTokens = (user.walletTokens * 1) + (amount * 1) + "";
         usersStorage.insert(username, user);
         res.json(user);
      }else {
         res.status(400).json(jsonStringify({ error: "User doesn't exist." }));
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

      if(usersStorage.values().some((user) => user.username === owner)){
         // const property: RealEstateProperty = {id: uuidv4(), address, owner, deedURL, createdAt: getCurrentDate(), tokenizedShares: new Map(), transactionHistory: [], updatedAt: null};
         const property: RealEstateProperty = new RealEstateProperty(address, owner, deedURL);
         property.tokenizedShares = [`${owner}:${shares}`];
         property.transactionHistory = [`Property created by ${property.owner}`];
         realEstatePropertiesStorage.insert(property.id, property);
         res.json(jsonStringify(property));
      }else{
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
	  
      const propertyOpt = realEstatePropertiesStorage.get(propertyId);
      if ("None" in propertyOpt) {
         res.status(404).json(jsonStringify({error: `Property with ID=${propertyId} not found`}));
      } else {
         res.json(jsonStringify(propertyOpt.Some));
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

      if(usersStorage.values().some((user) => user.username === owner)){
         const propertyOpt = realEstatePropertiesStorage.get(propertyId);
         if ("None" in propertyOpt) {
            res.status(400).json(jsonStringify({error: `Property with ID=${propertyId} not found`}));
         } else {
            const property = propertyOpt.Some;
            if(property.owner !== owner){
               res.status(400).json(jsonStringify({error: `Property can only be updated by its owner.`}));
            }else{
               const updatedProperty = { ...property, address, deedURL, updatedAt: getCurrentDate()};
               realEstatePropertiesStorage.insert(property.id, updatedProperty);
               res.json(jsonStringify(updatedProperty));
            }
         }
      }else{
         res.status(400).json(jsonStringify({error: `New owner not a registered user`}));
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
         return res.status(400).json(jsonStringify({ error: "username field must be provided" }));
      }

      const deletedProperty = realEstatePropertiesStorage.remove(propertyId);
      if ("None" in deletedProperty) {
         res.status(400).json(jsonStringify({error: `Property with ID=${propertyId} not found`}));
      } else {
         if(deletedProperty.Some.tokenizedShares.length > 1 || deletedProperty.Some.owner !== username){
            realEstatePropertiesStorage.insert(deletedProperty.Some.id, deletedProperty.Some);
            res.status(400).json(jsonStringify({error: `Only owners of the property can delete it and a property cannot be deleted if it has more than 1 shareholder.`}));
            return;
         }

         res.json(jsonStringify(deletedProperty.Some));
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

      const propertyOpt = realEstatePropertiesStorage.get(propertyId);
      if ("None" in propertyOpt) {
         res.status(400).json(jsonStringify({error: `Property with ID=${propertyId} not found`}));
         return;
      }

      const property = propertyOpt.Some;

      let fromShares:string | undefined = undefined;
      property.tokenizedShares.forEach(data => {
         let result = data.split(":");
         let numShares: string | undefined = result.pop();
         let name = result.join(":");
         if(name === from){
            fromShares = numShares;
         }
      })
      
      if (!fromShares || (fromShares*1) < shares) {
         res.status(400).json(jsonStringify({error: `You do not own ${shares} shares in property ${propertyId}`}));
         return;
      }

      if(usersStorage.values().some((user) => user.username === to)){
         // Update tokenized shares
         let isToSharesSet = false;
         property.tokenizedShares.forEach((data, index) => {
            let result = data.split(":");
            let numShares: any = result.pop();
            let name = result.join(":");
            if(name === from){
               if(!numShares){
                  res.status(400).json(jsonStringify({error: `You do not own ${shares} shares in property ${propertyId}`}));
                  return;
               }
               property.tokenizedShares[index] = `name:${(numShares*1) - (shares*1)}`;
            }else if(name === to){
               if(!numShares){
                  numShares = "0";
               }
               property.tokenizedShares[index] = `name:${(numShares*1) + (shares*1)}`;

               isToSharesSet = true;
            }
         });
         if(!isToSharesSet){
            property.tokenizedShares.push(`${to}:${shares}`);
         }

         // Update transaction history
         property.transactionHistory.push(`${shares} transferred from ${from} to ${to}`);

         // Transfer ownership if necessary
         let newOwner = property.owner;
         let mostShares = -1;
         property.tokenizedShares.forEach(val => {
            let result = val.split(":");
            let numShares: any = result.pop();
            let name = result.join(":");

            if((numShares*1) > mostShares){
               mostShares = (numShares*1);
               newOwner = name;
            }
         });
         property.owner = newOwner;

         realEstatePropertiesStorage.insert(property.id, property);
         res.json(jsonStringify(property));
      }else{
          res.status(400).json(jsonStringify({error: `${to} does not match any registered users.`}));
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
