const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- STATIC FILE SERVING ---
// Serves static files from the root directory
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
// Note: Ensure MONGO_URI in Vercel settings is your MongoDB Atlas URL
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected');
    seedAdmin(); 
}).catch(err => console.log('MongoDB Connection Error:', err));

// --- SCHEMAS (UPDATED FOR VERCEL) ---
// We check mongoose.models first to prevent "OverwriteModelError" in serverless environment

const teamSchema = new mongoose.Schema({
    teamName: String,
    member1: String,
    member2: String,
    status: { type: String, default: 'pending' },
    registeredAt: { type: Date, default: Date.now }
});
// FIX: Check if model exists before defining
const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

const contributorSchema = new mongoose.Schema({
    name: String,
    amount: Number
});
// FIX: Check if model exists before defining
const Contributor = mongoose.models.Contributor || mongoose.model('Contributor', contributorSchema);

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } 
});
// FIX: Check if model exists before defining (Critical for Login)
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// --- SEED ADMIN ---
async function seedAdmin() {
    try {
        // We use the model we safely defined above
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const newAdmin = new Admin({ username: 'admin', password: 'admin' });
            await newAdmin.save();
            console.log('Default Admin Created');
        }
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- ROUTES ---

// 1. HOME ROUTE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Admin Page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. Admin Login (UPDATED ERROR LOGGING)
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const admin = await Admin.findOne({ username, password });
        if (admin) {
            res.json({ success: true, token: "admin_token_secret" });
        } else {
            res.status(401).json({ success: false, message: "Invalid Credentials" });
        }
    } catch (err) {
        // Logs the actual error to Vercel console for debugging
        console.error("LOGIN ERROR DETAILS:", err);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// 4. Register Team
app.post('/register', async (req, res) => {
    const { teamName, member1, member2 } = req.body;
    const newTeam = new Team({ teamName, member1, member2, status: 'pending' });
    
    try {
        await newTeam.save();
        res.status(200).json({ message: 'Registration Received.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 5. Get Teams
app.get('/teams', async (req, res) => {
    const { type } = req.query; 
    try {
        let query = { status: 'approved' };
        if (type === 'all') query = {}; 
        
        const teams = await Team.find(query).sort({ registeredAt: -1 });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

// 6. Approve Team
app.post('/admin/approve', async (req, res) => {
    const { teamId } = req.body;
    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        team.status = 'approved';
        await team.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: "org@vidyagyan.in, org2.vidyagyan.in",
            subject: `Squad APPROVED: ${team.teamName}`,
            text: `Squad Registration Approved!\nTeam: ${team.teamName}\nStatus: APPROVED ✅`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log('Email Error:', error);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error approving team" });
    }
});

// 7. Delete Team
app.post('/admin/delete', async (req, res) => {
    const { teamId } = req.body;
    try {
        await Team.findByIdAndDelete(teamId);
        res.json({ success: true, message: "Team deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting team" });
    }
});

// 8. Manage Contributors
app.post('/admin/contributor', async (req, res) => {
    const { name, amount } = req.body;
    try {
        const newContributor = new Contributor({ name, amount });
        await newContributor.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error adding contributor" });
    }
});

app.get('/contributors', async (req, res) => {
    try {
        const contributors = await Contributor.find().sort({ amount: -1 });
        res.json(contributors);
    } catch (err) {
        res.status(500).json({ message: "Error fetching contributors" });
    }
});

// --- VERCEL EXPORT (REQUIRED) ---
module.exports = app;

// --- LOCAL SERVER START ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
