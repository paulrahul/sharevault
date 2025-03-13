const express = require('express');
const path = require('path');
const multer = require('multer');
const { analyseChat } = require('./links_helper'); // Import your function

const app = express();
const PORT = 3000;

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname)));

// Configure file uploads
const upload = multer({ dest: 'uploads/' });

// API route to handle file uploads and call analyseChat
app.post('/analyse', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.path; // Temporary file path
        const results = await analyseChat(filename, { expandSpotify: true, expandYoutube: true, updateSweating: false });

        res.json({ file_contents: results });
    } catch (error) {
        console.error('Error analysing file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
