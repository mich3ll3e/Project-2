const express = require('express');
const session = require("express-session");
const http = require("http");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const passport = require("./config/passport");
const isAuthenticated = require("./config/middleware/isAuthenticated");
const db = require("./models");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({ secret: "keyboard cat", resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

const botName = "ChatBot";
let username="username";

io.on("connection", socket=>{
    //welcome current user
    socket.emit("message",formatMessage(botName, "welcome to chat"));

    //Bordcast when a user connects
    socket.broadcast.emit("message", formatMessage(botName,`${username}has joined the chat` ));

    //when client disconnects
    socket.on("disconnect",()=>{
        io.emit("message", formatMessage(botName, `${username} has left the chat`));
    });

    //Listen for chat Message
    socket.on("chatMessage",(msg)=>{
        io.emit("message",formatMessage(msg.userName, msg.text));
    });

});

app.get("/signup",(req,res)=>{
    res.render("signup");
});
app.get("/chat", isAuthenticated,(req,res)=>{
    db.User.findAll({raw: true}).then(dbUsers=>{
        res.render("chat",{users:dbUsers});
    })
    
});
app.get("/",(req,res)=>{
    res.render("index")
});

app.get("/login",(req,res)=>{
    res.render("login");
})

app.post("/api/signup",(req,res)=>{
    console.log(req.body);
    db.User.create({
        username:req.body.username,
        password:req.body.password
    })
    .then(function() {
        res.redirect("/login");
      })
      .catch(function(err) {
        res.status(401).json(err);
      });
});

app.post("/api/login", passport.authenticate("local"),(req,res)=>{
    console.log(req.user);
    res.json(req.user);
});

app.get("/api/user_data", function(req, res) {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      username = req.user.username;
      res.json({
        username: req.user.username,
        id: req.user.id
      });
    }
  });

const PORT = process.env.PORT || 8080

db.sequelize.sync().then(()=>{
    server.listen(PORT, ()=>{
        console.log('app working' + PORT);
    });
})