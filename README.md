# BigQuery Release Pulse

Track, filter, comment on, and tweet Google Cloud BigQuery updates instantly.

BigQuery Release Pulse is a premium, modern dark-themed web application that fetches, parses, and formats the official Google BigQuery Release Notes RSS/Atom feed. It allows team members to read, discuss internally, and easily draft and share updates directly to X (Twitter).

---

## Key Features

- **Live Atom Feed Integration:** Automatically fetches and processes live release notes directly from Google's official Atom feed.
- **Granular Update Parsing:** Dynamically segments daily release notes into individual updates (e.g., Features, Issues, Changes, Deprecations, General).
- **Control Center & Tweet Composer:** An interactive composer panel drafts social posts with character limit indicators, taking into account X's automatic link shortening (URL counted as 23 characters).
- **Internal Discussion Board (talks.json):** Post comments and notes on specific updates. Comments are stored locally in a lightweight JSON database file.
- **Advanced Filtering & Search:** Filter updates instantly by type (e.g., Features, Issues, etc.) or perform text searches over contents.
- **Premium Aesthetics:** Dark mode layout with subtle background glows, glassmorphism, responsive grids, micro-animations, and styled elements.

---

## Technology Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML5, Vanilla CSS, Vanilla JavaScript
- **Database:** Local file-based storage (`talks.json`)

---

## File Structure

```text
bigquery_releasenotes_app/
├── server.js            # Node.js Express server and XML feed parser
├── talks.json           # Local JSON database for comments/notes
├── package.json         # Project metadata and dependencies
├── .gitignore           # Version control ignores (excludes node_modules and portable runtime)
├── templates/
│   └── index.html       # Application main HTML template
└── static/
    ├── style.css        # Premium custom stylesheet with variables and keyframe animations
    └── script.js        # Frontend interactions, state, and API communication logic
```

---

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v20.0.0 or higher recommended).

### Installation

1. Clone or copy the project folder to your local machine.
2. Open a terminal in the project root directory.
3. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the server:
   ```bash
   npm start
   ```
2. Open your web browser and navigate to:
   ```text
   http://localhost:5000
   ```

---

## API Endpoints

- **`GET /api/releases`** - Fetches the live BigQuery RSS feed, parses the XML, matches updates with local comments from `talks.json`, and returns structured JSON.
- **`POST /api/comments`** - Adds a comment to a specific release update.
  - **Body Format:**
    ```json
    {
      "updateId": "tag:google.com,2016:bigquery-release-notes#June_15_2026_0",
      "author": "Your Name",
      "text": "Your comment here"
    }
    ```
