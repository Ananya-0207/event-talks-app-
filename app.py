import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_text):
    if not html_text:
        return ""
    # Replace common block elements with spaces to prevent words from sticking together
    text = re.sub(r'</?(p|div|h1|h2|h3|li|ul|ol|br|blockquote|section|article)[^>]*>', ' ', html_text)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_content(content_html):
    if not content_html:
        return []
    
    parts = re.split(r'<h3>(.*?)</h3>', content_html)
    updates = []
    
    if len(parts) == 1:
        clean_text = clean_html_to_text(content_html)
        updates.append({
            "type": "General",
            "content": content_html.strip(),
            "text": clean_text
        })
        return updates
    
    first_part = parts[0].strip()
    if first_part:
        clean_text = clean_html_to_text(first_part)
        updates.append({
            "type": "General",
            "content": first_part,
            "text": clean_text
        })
        
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            update_type = parts[i].strip()
            update_content = parts[i+1].strip()
            clean_text = clean_html_to_text(update_content)
            updates.append({
                "type": update_type,
                "content": update_content,
                "text": clean_text
            })
            
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Antigravity BigQuery Release Notes Fetcher)'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        
        # Parse namespaces if present
        # Atom feed standard namespace is usually http://www.w3.org/2005/Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        entries = []
        for entry_el in root.findall('atom:entry', ns):
            title_el = entry_el.find('atom:title', ns)
            id_el = entry_el.find('atom:id', ns)
            updated_el = entry_el.find('atom:updated', ns)
            
            # Link element might have no children, we check the href attribute
            link_el = entry_el.find('atom:link[@rel="alternate"]', ns)
            if link_el is None:
                link_el = entry_el.find('atom:link', ns)
            
            link_href = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry_el.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ''
            
            title = title_el.text if title_el is not None else ''
            entry_id = id_el.text if id_el is not None else ''
            updated = updated_el.text if updated_el is not None else ''
            
            updates = parse_content(content_html)
            
            entries.append({
                "id": entry_id,
                "title": title,
                "updated": updated,
                "link": link_href,
                "updates": updates
            })
            
        return jsonify({
            "status": "success",
            "feed_title": feed_title_text,
            "entries": entries
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
