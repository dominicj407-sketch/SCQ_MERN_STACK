const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
const passport=require("passport");
const cookieParser=require("cookie-parser");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const app=express();
const Patient=require("../models/Patient.js");
app.use(cors({
 origin:"http://localhost:5500",
 credentials:true
}));
app.use(express.json());
app.use(passport.initialize());
app.use(cookieParser());
const access_key="leo123";
const refresh_key="doms123";
let refreshTokens=[];
function createAToken(user){
 return jwt.sign(user,access_key,{expiresIn:"1m"});
}
function createRToken(user){
 const token=jwt.sign(user,refresh_key,{expiresIn:"1d"});
 refreshTokens.push(token);
 return token;
}
 passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:"/auth/google/callback",
  proxy: true
},async(accessToken,refreshToken,profile,done)=>{

 const email=profile.emails?.[0]?.value;
 const user=await Patient.findOne({email});

 if(!user){
   const user=await new Patient({
     password:null,
     name:profile.displayName,
     email
   });
   await user.save();
 }

 return done(null,user);
}));



app.post("/login",async (req,res)=>{
 const {email,password}=req.body;

 const u=await Patient.findOne({email});
 if(!u) return res.status(401).json({msg:"invalid"});
if(u.password!=password)
{
    return res.status(404).json({msg:"password incorrect"});
}
 const payload={role:"patient",email:u.email};
 const at=createAToken(payload);
 const rt=createRToken(payload);
 res.cookie("refreshToken",rt,{httpOnly:true,sameSite:"strict",secure:false});
 res.json({accessToken:at});
});
app.get("/auth/google",
 passport.authenticate("google",{scope:["profile","email"]})
);
app.get("/auth/google/callback",
 passport.authenticate("google",{session:false}),
 (req,res)=>{

   const payload={name:req.user.email,role:"patient"};

   const at=createAToken(payload);
   const rt=createRToken(payload);

   res.cookie("refreshToken",rt,{httpOnly:true,sameSite:"strict",secure:false});
  console.log(users);
   res.json({accessToken:at});
});



app.post("/refresh",(req,res)=>{
 const token=req.cookies.refreshToken;

 if(!token) return res.status(401).json({msg:"logout"});
 if(!refreshTokens.includes(token)) return res.status(403).json({msg:"logout"});

jwt.verify(token,refresh_key,(err,user)=>{
   if(err) return res.status(403).json({msg:"logout"});

   const payload = {
      id: user.id,
      name: user.name
   };

   const at = createAToken(payload);
   res.json({accessToken:at});
});

});


app.post("/logout",(req,res)=>{
 const t=req.cookies.refreshToken;
 refreshTokens=refreshTokens.filter(x=>x!==t);
 res.clearCookie("refreshToken");
 res.json({msg:"logged out"});
});
 

app.get("/check",auth,(req,res)=>{
    res.json({msg:"vetri"});
})


function auth(req,res,next){
 const h=req.headers.authorization;
 if(!h) return res.sendStatus(401);

 const token=h.split(" ")[1];

 jwt.verify(token,access_key,(err,user)=>{
   if(err) return res.sendStatus(401);
   req.user=user;
   next();
 });
}
