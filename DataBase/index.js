import express from "express";
import pg from "pg";
import cors from "cors";
import bodyParser from 'body-parser';
import bcrypt from "bcrypt";

const db= new pg.Client({
    user:"postgres",
    host:"localhost",
    database:"FosterAI",
    password:"12345",
    port:5432,
});

const app=express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const port=3000;
// const cors = require("cors");

let current_email;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

db.connect();

let messages=[];

   

app.get("/api/messages/send",async (req,res)=>{
        await db.query("SELECT txt,isbot FROM messages where user_id=(SELECT id FROM users WHERE email=$1)",[current_email],(err,res)=>{
            if(err){
                console.error("Error executing query",err.stack);
            }else{
                messages=res.rows;
                console.log(messages);
                
            }
        }); 
        res.json(messages);
    
});

app.post("/api/messages/receive", async (req, res) => {
    try {
    //   const { userText, response } = req.body;
      const {userText,response}=req.body;  
      console.log(userText);
      console.log(response);
        // Insert user message
  await db.query("INSERT INTO messages (user_id,txt,isbot) VALUES ((SELECT id FROM users WHERE email = $1),$2,$3)", [
    current_email,
    userText,
    false,
  ]);

  // Insert AI response
  await db.query("INSERT INTO messages (user_id,txt,isbot) VALUES ((SELECT id FROM users WHERE email = $1),$2,$3)", [
    current_email,
    response,
    true,
  ]);
      
  
      res.status(200).json({ message: "Messages saved successfully" });
    } catch (error) {
      console.error("Error saving messages:", error);
      res.status(500).json({ error: "Internal server error" });
    //   console.log(userText);
    //   console.log(response);
    }
    
  });

app.post("/api/messages/new_chat",async (req,res)=>{
    try{
        await db.query("DELETE FROM messages WHERE (SELECT id FROM users WHERE email = $1)=user_id;",[current_email]);
        console.log("ALL messages deleted successfully")
    }catch(error){
        console.error("Error in deleting")
    }  
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  current_email = email;
  console.log(current_email);
  const saltRounds = 10;

  try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

      if (checkResult.rows.length > 0) {
          res.send("Email already exists. Try logging in.");
      } else {
          // Use async/await with bcrypt.hash to ensure it completes before proceeding
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          
          await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hashedPassword]);

          console.log("SignUp successful");
          // Set current_email before sending the response
          current_email = email;
          res.status(200).json({ message: "SignUp successful", redirectUrl: "/home" });
      }
  } catch (error) {
      console.log("Error in receiving Signup Credentials at API side", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  current_email = email;
  // console.log(email);
  // console.log(password);

  try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;

          // Use async/await with bcrypt.compare to ensure it completes before proceeding
          const passwordMatch = await bcrypt.compare(password, storedHashedPassword);
          
          if (passwordMatch) {
              console.log("Login successful");
              // Set current_email before sending the response
              current_email = email;
              // Send a response to the client with a success message and the redirect URL
              res.status(200).json({ message: "Login successful", redirectUrl: "/home" });
          } else {
              res.send("Incorrect Password");
          }
      } else {
          res.send("User not found");
      }
  } catch (error) {
      console.log("Error in receiving Login Credentials at API side", error);
      res.status(500).json({ error: "Internal server error" });
  }
});



  

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
