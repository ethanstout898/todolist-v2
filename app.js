//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const punycode = require("punycode/");
const _ = require("lodash");
require("dotenv").config();

const app = express();

const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

mongoose.set("strictQuery", false);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(limiter);

mongoose.connect("mongodb+srv://admin:"+process.env.DB_PASSWORD+"@"+process.env.CLUSTER+".mongodb.net/"+process.env.DB_NAME, {useNewUrlParser: true});

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your notes!"
});

const item2 = new Item({
  name: "Hit the + button to add a note."
});

const item3 = new Item({
  name: "<-- Hit this to delete a note."
});

const defaultItems = [item1, item2, item3];

const listSchema = mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("list", listSchema);

app.get("/", function(req, res) {
  Item.find() 
  .then(foundItems => {
    if(foundItems.length === 0) {
      Item.insertMany(defaultItems)
      .then(() => {
        console.log("Items successfully added to todolistDB");
        res.redirect("/");
      })
      .catch(err => {
        console.log(err);
      });
    } else {
      res.render("list", {listTitle: "Notes", newListItems: foundItems});
    }
  })
  .catch(err => {
    console.log(err);
  });
});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({name: customListName})
  .then(foundList => {
    if(!foundList) {
      const list = List({
        name: customListName,
        items: defaultItems
      });
      list.save();
      res.redirect("/" + customListName);
    } else {
      res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
    }
  })
  .catch(err => {
    console.log(err);
  })
});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if(listName === "Notes") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: {$eq: listName}})
    .then(foundList => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    })
    .catch(err => {
      console.log(err);
    });
  }
});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (typeof checkedItemId !== "string") {
    res.status(400).json({ status: "error", message: "Invalid item ID" });
    return;
  }

  if(listName === "Notes") {
    Item.findByIdAndDelete(checkedItemId)
    .then(() => {
      res.redirect("/");
    })
    .catch(err => {
      console.log(err);
    });
  } else {
    List.findOneAndUpdate({name: {$eq: listName}}, {$pull: {items: {_id: {$eq: checkedItemId}}}})
    .then(() => {
      res.redirect("/" + listName);
    })
    .catch(err => {
      console.log(err);
    });
  }
});

let port = process.env.PORT;
if(port == null || port == "") {
  port = 3000;
};

app.listen(port, function() {
  console.log("Server has started successfully");
});
