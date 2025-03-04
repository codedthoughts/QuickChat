const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

const CALLBACK_URL = 'https://quickchat-m575.onrender.com/auth/google/callback';
console.log('Initializing Google Strategy with:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Callback URL:', CALLBACK_URL);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google callback received for user:', profile.emails[0].value);
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }

        // Create new user
        user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: profile.photos[0].value
        });

        return done(null, user);
    } catch (err) {
        console.error('Error in Google Strategy callback:', err);
        return done(err, null);
    }
}));
