import passport from "passport";
import GoogleTokenStrategy from "passport-google-id-token";

passport.use(
  new GoogleTokenStrategy(
    {
      clientID:
        "458858866461-kki809pbebvb2stct82it96u8btb4tjk.apps.googleusercontent.com",
    },
    function (parsedToken, googleId, done) {
      // This gets called when the token is valid
      // console.log("TOKEN:", parsedToken);
      // console.log("GOOGLE ID:", googleId);
      let profile = parsedToken.data;
      // console.log("Google profile:", profile);
      profile.provider = "google";
      profile.id = googleId;

      // Example: save to DB, or just return user
      return done(null, profile);
    }
  )
);
