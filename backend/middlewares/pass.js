const access_key="leo123";
const refresh_key="doms123";
const passport=require("passport");
const Patient=require("../models/Patient");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
passport.use(new GoogleStrategy({
 clientID: process.env.GOOGLE_CLIENT_ID,
 clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 callbackURL:"http://localhost:3000/auth/google/callback"
},async (accessToken,refreshToken,profile,done)=>{

 const email=profile.emails?.[0]?.value;
 const user=await Patient.findOne({email});

 if(!user){
   const user=await new Patient({
     password:"########",
     name:profile.displayName,
     email,
     gender:"male",
     age:24,
     phone:"+917708436256"
   });
   console.log(user);
   await user.save();
    return done(null,user);
 }

 return done(null,user);
}));
module.export=passport;