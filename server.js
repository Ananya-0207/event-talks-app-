const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const FEED_URL = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml';
const TALKS_FILE = path.join(__dirname, 'talks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Helper: Read talks (comments) from talks.json
function readTalks() {
    try {
        if (!fs.existsSync(TALKS_FILE)) {
            fs.writeFileSync(TALKS_FILE, JSON.stringify({}));
        }
        const data = fs.readFileSync(TALKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading talks.json:', err);
        return {};
    }
}

// Helper: Save talks to talks.json
function saveTalks(talks) {
    try {
        fs.writeFileSync(TALKS_FILE, JSON.stringify(talks, null, 2));
    } catch (err) {
        console.error('Error writing to talks.json:', err);
    }
}

// Helper: Clean HTML tags for plain text (Twitter)
function cleanHtmlToText(htmlText) {
    if (!htmlText) return '';
    let text = htmlText.replace(/<\/?(p|div|h1|h2|h3|li|ul|ol|br|blockquote|section|article)[^>]*>/gi, ' ');
    text = text.replace(/<[^>]+>/g, '');
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    return text.replace(/\s+/g, ' ').trim();
}

// Helper: Parse entry content into individual updates
function parseUpdates(contentHtml) {
    if (!contentHtml) return [];
    
    // Split content by <h3>(Feature|Issue|Deprecation|Change|etc.)</h3>
    const parts = contentHtml.split(/<h3>(.*?)<\/h3>/i);
    const updates = [];
    
    if (parts.length === 1) {
        updates.push({
            type: 'General',
            content: contentHtml.trim(),
            text: cleanHtmlToText(contentHtml)
        });
        return updates;
    }
    
    const firstPart = parts[0].trim();
    if (firstPart) {
        updates.push({
            type: 'General',
            content: firstPart,
            text: cleanHtmlToText(firstPart)
        });
    }
    
    for (let i = 1; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
            const updateType = parts[i].trim();
            const updateContent = parts[i + 1].trim();
            updates.push({
                type: updateType,
                content: updateContent,
                text: cleanHtmlToText(updateContent)
            });
        }
    }
    return updates;
}

// Helper: Basic XML parsing utilizing Regex (Google Cloud Feed format is highly stable)
function parseAtomFeed(xmlString) {
    const entries = [];
    const entryMatches = xmlString.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    
    const getTagContent = (xml, tagName) => {
        const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`));
        return match ? match[1].trim() : '';
    };
    
    const getLinkHref = (xml) => {
        const match = xml.match(/<link[^>]+href=["']([^"']+)["']/);
        return match ? match[1] : '';
    };
    
    const cleanCDATA = (str) => {
        return str.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
    };

    const feedTitleMatch = xmlString.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const feedTitle = feedTitleMatch ? feedTitleMatch[1].trim() : 'BigQuery Release Notes';

    for (const entryXml of entryMatches) {
        const title = getTagContent(entryXml, 'title');
        const id = getTagContent(entryXml, 'id');
        const updated = getTagContent(entryXml, 'updated');
        const link = getLinkHref(entryXml);
        
        let contentRaw = getTagContent(entryXml, 'content');
        contentRaw = cleanCDATA(contentRaw);
        
        const updates = parseUpdates(contentRaw);
        
        entries.push({
            id,
            title,
            updated,
            link,
            updates
        });
    }
    
    return { feedTitle, entries };
}

// Serve root SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// API: Get releases with associated comments
app.get('/api/releases', async (req, res) => {
    try {
        const response = await fetch(FEED_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Antigravity BigQuery Release Notes Fetcher)' }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch feed: ${response.statusText}`);
        }
        
        const xmlData = await response.text();
        const parsed = parseAtomFeed(xmlData);
        
        // Load comments and merge
        const talks = readTalks();
        
        const entriesWithComments = parsed.entries.map(entry => {
            const updatesWithComments = entry.updates.map((update, index) => {
                const updateId = `${entry.id}_${index}`;
                return {
                    ...update,
                    id: updateId,
                    comments: talks[updateId] || []
                };
            });
            return {
                ...entry,
                updates: updatesWithComments
            };
        });
        
        res.json({
            status: 'success',
            feed_title: parsed.feedTitle,
            entries: entriesWithComments
        });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({
            status: 'error',
            message: err.message || 'Error occurred while loading releases'
        });
    }
});

// API: Add a comment (talk) to an update
app.post('/api/comments', (req, res) => {
    const { updateId, author, text } = req.body;
    
    if (!updateId || !author || !text) {
        return res.status(400).json({
            status: 'error',
            message: 'Fields updateId, author, and text are required.'
        });
    }
    
    const talks = readTalks();
    if (!talks[updateId]) {
        talks[updateId] = [];
    }
    
    const newComment = {
        author: author.trim(),
        text: text.trim(),
        timestamp: new Date().toISOString()
    };
    
    talks[updateId].push(newComment);
    saveTalks(talks);
    
    res.json({
        status: 'success',
        comments: talks[updateId]
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
