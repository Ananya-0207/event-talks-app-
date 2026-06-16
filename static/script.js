// Application State
let releasesData = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdateId = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const filterGroup = document.getElementById('filter-group');
const releasesContainer = document.getElementById('releases-container');
const resultsCount = document.getElementById('results-count');
const statusText = document.getElementById('status-text');
const pulseDot = document.querySelector('.pulse-dot');

// States elements
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');

// Composer elements
const composerEmptyState = document.getElementById('composer-empty-state');
const composerCard = document.getElementById('composer-card');
const selectedTypeBadge = document.getElementById('selected-type-badge');
const selectedDate = document.getElementById('selected-date');
const selectedSummaryPreview = document.getElementById('selected-summary-preview');
const composerText = document.getElementById('composer-text');
const charCountNum = document.getElementById('char-count-num');
const progressBar = document.getElementById('progress-bar');
const charValidationMsg = document.getElementById('char-validation-msg');
const tweetBtn = document.getElementById('tweet-btn');

// Circular Progress Ring calculations
const ringRadius = 14;
const ringCircumference = 2 * Math.PI * ringRadius; // ~87.96
progressBar.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
progressBar.style.strokeDashoffset = ringCircumference;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });
    
    filterGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            
            activeFilter = e.target.dataset.filter;
            renderFeed();
        }
    });
    
    composerText.addEventListener('input', updateCharCount);
    
    tweetBtn.addEventListener('click', () => {
        const text = composerText.value.trim();
        if (text.length === 0) return;
        
        const twitterLength = calculateTwitterLength(text);
        if (twitterLength > 280) {
            alert('Your tweet exceeds the 280 character limit.');
            return;
        }
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    });
}

// Fetch Release Notes Feed
async function fetchReleases() {
    // UI Loading State
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;
    loadingState.classList.remove('hidden');
    releasesContainer.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    statusText.textContent = 'Syncing...';
    pulseDot.style.backgroundColor = '#f59e0b';
    pulseDot.style.boxShadow = '0 0 8px #f59e0b';
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            releasesData = data.entries;
            renderFeed();
            
            statusText.textContent = 'Updated';
            pulseDot.style.backgroundColor = '#10b981';
            pulseDot.style.boxShadow = '0 0 8px #10b981';
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message || 'Unable to load feed data from backend.';
        errorState.classList.remove('hidden');
        
        statusText.textContent = 'Sync Failed';
        pulseDot.style.backgroundColor = '#f43f5e';
        pulseDot.style.boxShadow = '0 0 8px #f43f5e';
    } finally {
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
}

// Filter and Render Feed items
function renderFeed() {
    releasesContainer.innerHTML = '';
    releasesContainer.classList.remove('hidden');
    
    let totalItemsRendered = 0;
    
    releasesData.forEach(entry => {
        // Filter updates within the entry
        const filteredUpdates = entry.updates.filter(update => {
            const matchesFilter = activeFilter === 'all' || update.type.toLowerCase() === activeFilter;
            const matchesSearch = searchQuery === '' || 
                                  update.type.toLowerCase().includes(searchQuery) || 
                                  update.text.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });
        
        if (filteredUpdates.length > 0) {
            const entryCard = createEntryCard(entry, filteredUpdates);
            releasesContainer.appendChild(entryCard);
            totalItemsRendered += filteredUpdates.length;
        }
    });
    
    resultsCount.textContent = `${totalItemsRendered} item${totalItemsRendered !== 1 ? 's' : ''} found`;
    
    if (totalItemsRendered === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// Helper: Create Day Card DOM element
function createEntryCard(entry, updates) {
    const card = document.createElement('div');
    card.className = 'release-day-card';
    
    const header = document.createElement('div');
    header.className = 'release-header';
    
    const title = document.createElement('h3');
    title.className = 'release-date';
    title.textContent = entry.title;
    
    const link = document.createElement('a');
    link.className = 'release-link';
    link.href = entry.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `
        <span>Full Notes</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
    `;
    
    header.appendChild(title);
    header.appendChild(link);
    card.appendChild(header);
    
    const updatesContainer = document.createElement('div');
    updatesContainer.className = 'release-updates';
    
    updates.forEach((update, index) => {
        const updateId = `${entry.id}_${index}`;
        const updateEl = document.createElement('div');
        updateEl.className = 'update-item';
        if (selectedUpdateId === updateId) {
            updateEl.classList.add('selected');
        }
        
        const typeClass = getBadgeClass(update.type);
        
        updateEl.innerHTML = `
            <div class="update-meta">
                <span class="type-badge ${typeClass}">${update.type}</span>
                <span class="select-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                    </svg>
                    <span>Click to draft Tweet</span>
                </span>
            </div>
            <div class="update-content">${update.content}</div>
        `;
        
        updateEl.addEventListener('click', () => {
            selectUpdate(updateId, update, entry.title, entry.link);
        });
        
        updatesContainer.appendChild(updateEl);
    });
    
    card.appendChild(updatesContainer);
    return card;
}

// Select update card and populate composer
function selectUpdate(id, update, date, link) {
    selectedUpdateId = id;
    
    // Toggle highlight class in feed
    document.querySelectorAll('.update-item').forEach(el => el.classList.remove('selected'));
    
    // Find active element in feed and select it
    // Wait for render to finish or do it dynamically
    const items = document.querySelectorAll('.update-item');
    items.forEach(item => {
        // If content matches (as IDs are regenerated on render)
        if (item.querySelector('.update-content').innerHTML === update.content) {
            item.classList.add('selected');
        }
    });
    
    // Activate Composer
    composerEmptyState.classList.add('hidden');
    composerCard.classList.remove('hidden');
    
    // Setup composer metadata
    selectedTypeBadge.textContent = update.type;
    selectedTypeBadge.className = `type-badge ${getBadgeClass(update.type)}`;
    selectedDate.textContent = date;
    selectedSummaryPreview.textContent = update.text;
    
    // Draft tweet structure
    const hashtags = "#GoogleCloud #BigQuery";
    const header = `📢 ${update.type} in #BigQuery Release Notes (${date}):\n\n`;
    const footer = `\n\nRead more: ${link}`;
    
    // Target length limit is 280
    // Twitter handles URLs as 23 characters
    const estimatedHeaderLen = header.length;
    const estimatedFooterLen = footer.length - link.length + 23; // replace link with 23 chars
    const availableTextLen = 280 - estimatedHeaderLen - estimatedFooterLen - 6; // buffer for quotes
    
    let cleanText = update.text;
    if (cleanText.length > availableTextLen) {
        cleanText = cleanText.substring(0, availableTextLen - 3) + "...";
    }
    
    composerText.value = `${header}"${cleanText}"${footer}`;
    updateCharCount();
}

// Calculate length taking into account Twitter URL shortener (always 23 chars)
function calculateTwitterLength(text) {
    // Regex for matching URLs
    const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
    let length = text.length;
    
    const matches = text.match(urlRegex);
    if (matches) {
        matches.forEach(url => {
            // Deduct original URL length and add 23 characters
            length = length - url.length + 23;
        });
    }
    return length;
}

// Update Character counts and ring color indicators
function updateCharCount() {
    const text = composerText.value;
    const twitterLength = calculateTwitterLength(text);
    const charsRemaining = 280 - twitterLength;
    
    charCountNum.textContent = charsRemaining;
    
    // Calculate progress percentage
    const percent = Math.min((twitterLength / 280) * 100, 100);
    const offset = ringCircumference - (percent / 100) * ringCircumference;
    progressBar.style.strokeDashoffset = offset;
    
    // Color indicator classes
    charCountNum.className = 'char-count-num';
    progressBar.style.stroke = 'var(--accent-primary)';
    charValidationMsg.textContent = '';
    charValidationMsg.className = 'validation-msg';
    tweetBtn.disabled = false;
    
    if (charsRemaining <= 30 && charsRemaining >= 0) {
        charCountNum.classList.add('warning');
        progressBar.style.stroke = 'var(--change-color)';
    } else if (charsRemaining < 0) {
        charCountNum.classList.add('error');
        progressBar.style.stroke = 'var(--issue-color)';
        charValidationMsg.textContent = `Limit exceeded by ${Math.abs(charsRemaining)} characters`;
        charValidationMsg.classList.add('error');
        tweetBtn.disabled = true;
    }
    
    if (text.trim().length === 0) {
        tweetBtn.disabled = true;
    }
}

// Helper: Map update type to CSS class
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'type-feature';
    if (t.includes('issue')) return 'type-issue';
    if (t.includes('change')) return 'type-change';
    if (t.includes('deprecat')) return 'type-deprecation';
    return 'type-general';
}
