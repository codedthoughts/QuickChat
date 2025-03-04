const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user:', id);
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        console.error('Deserialize error:', err);
        done(err, null);
    }
});

const GOOGLE_CONFIG = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://quickchat-m575.onrender.com/auth/google/callback',
    proxy: true
};

console.log('Google Strategy Config:', {
    clientID: GOOGLE_CONFIG.clientID,
    callbackURL: GOOGLE_CONFIG.callbackURL
});

passport.use(new GoogleStrategy(GOOGLE_CONFIG, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google callback received for user:', profile.emails[0].value);
        
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            console.log('Existing user found:', user.email);
            return done(null, user);
        }

        // Create new user
        user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: profile.photos[0].value
        });

        console.log('New user created:', user.email);
        return done(null, user);
    } catch (err) {
        console.error('Error in Google Strategy callback:', err);
        return done(err, null);
    }
}));
