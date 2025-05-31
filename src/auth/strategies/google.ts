import passport from "passport";
import GoogleTokenStrategy from "passport-google-id-token";

interface ParsedToken {
  header: {
    alg: string;
    kid: string;
    typ: string;
  };
  data: {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: boolean;
    at_hash: string;
    nonce: string;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: number;
    exp: number;
    [key: string]: any;
  };
  isAuthentic: boolean;
  isExpired: boolean;
}

passport.use(
  new GoogleTokenStrategy(
    {
      clientID:
        "458858866461-kki809pbebvb2stct82it96u8btb4tjk.apps.googleusercontent.com",
    },
    function (parsedToken, googleId, done) {
      // This gets called when the token is valid

      const token = parsedToken as unknown as ParsedToken;

      console.log("TOKEN:", token);
      console.log("GOOGLE ID:", googleId);
      let profile = token.data;
      // console.log("Google profile:", profile);
      profile.provider = "google";
      profile.id = googleId;

      // Example: save to DB, or just return user
      return done(null, profile);
    }
  )
);
