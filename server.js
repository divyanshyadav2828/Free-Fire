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
app.use(express.static('./')); // Serves static files

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected');
    seedAdmin(); // Run the script to create admin user on startup
}).catch(err => console.log('MongoDB Connection Error:', err));

// --- SCHEMAS ---

// Team Schema
const teamSchema = new mongoose.Schema({
    teamName: String,
    member1: String,
    member2: String,
    status: { type: String, default: 'pending' }, // pending, approved
    registeredAt: { type: Date, default: Date.now }
});
const Team = mongoose.model('Team', teamSchema);

// Contributor Schema
const contributorSchema = new mongoose.Schema({
    name: String,
    amount: Number
});
const Contributor = mongoose.model('Contributor', contributorSchema);

// Admin Schema (For Login)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } 
});
const Admin = mongoose.model('Admin', adminSchema);

// --- SCRIPT TO MAKE ADMIN USER ---
async function seedAdmin() {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            // Create default admin if it doesn't exist
            const newAdmin = new Admin({ username: 'admin', password: 'admin' });
            await newAdmin.save();
            console.log('System Message: Default Admin User (admin/admin) created successfully.');
        } else {
            console.log('System Message: Admin user already exists.');
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

// 1. Serve Admin Page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 2. Admin Login (Database Check)
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
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 3. Register Team (User Facing) - Sets to PENDING
app.post('/register', async (req, res) => {
    const { teamName, member1, member2 } = req.body;
    const newTeam = new Team({ teamName, member1, member2, status: 'pending' });
    
    try {
        await newTeam.save();
        // We DO NOT send email here anymore. We send it on approval.
        res.status(200).json({ message: 'Registration Received. Waiting for Approval.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 4. Get Teams (Admin: all, Public: approved only)
app.get('/teams', async (req, res) => {
    const { type } = req.query; // 'all' for admin, undefined for public
    try {
        let query = { status: 'approved' };
        if (type === 'all') query = {}; // Admin sees everything
        
        const teams = await Team.find(query).sort({ registeredAt: -1 });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

// 5. Approve Team (Admin Only)
app.post('/admin/approve', async (req, res) => {
    const { teamId } = req.body;
    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        team.status = 'approved';
        await team.save();

        // Send Email NOW (Only on approval)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: "org@vidyagyan.in, org2.vidyagyan.in",
            subject: `Squad APPROVED: ${team.teamName}`,
            text: `
                Squad Registration Approved!
                
                Team Name: ${team.teamName}
                Member 1: ${team.member1}
                Member 2: ${team.member2}
                
                Status: APPROVED ✅
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log('Email Error:', error);
            else console.log('Email sent: ' + info.response);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error approving team" });
    }
});

// 6. Delete/Deny Team (Admin Only) - NEW
app.post('/admin/delete', async (req, res) => {
    const { teamId } = req.body;
    try {
        await Team.findByIdAndDelete(teamId);
        res.json({ success: true, message: "Team deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting team" });
    }
});

// 7. Manage Contributors
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});