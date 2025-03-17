/**
 * Client-side links helper
 * Extracts and processes links from chat files
 */
class LinksHelper {
    constructor() {
      this.spotifyHelper = new SpotifyHelper();
      this.youtubeHelper = new YouTubeHelper();
    }
    
    /**
     * Extract individual messages from WhatsApp chat export
     * @param {string} text - Chat text content
     * @returns {Array} Array of [timestamp, message] pairs
     */
    extractEachMessage(text) {
      // WhatsApp timestamp pattern (handles different date formats)
      const timestampPattern = /\[\d{2}[./]\d{2}[./]\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?\] /g;
      const results = [];
      let lastIndex = 0;
      let match;
      
      // Find all timestamps and split messages
      while ((match = timestampPattern.exec(text)) !== null) {
        if (lastIndex > 0) {
          const previousTimestamp = text.substring(lastIndex, lastIndex + text.substring(lastIndex).indexOf(']') + 1);
          const messageContent = text.substring(lastIndex + previousTimestamp.length, match.index).trim();
          results.push([previousTimestamp, messageContent]);
        }
        
        lastIndex = match.index;
      }
      
      // Add the last message
      if (lastIndex > 0) {
        const previousTimestamp = text.substring(lastIndex, lastIndex + text.substring(lastIndex).indexOf(']') + 1);
        const messageContent = text.substring(lastIndex + previousTimestamp.length).trim();
        results.push([previousTimestamp, messageContent]);
      }
      
      return results;
    }
    
    /**
     * Extract links from messages with user and timestamp context
     * @param {Array} messages - Array of [timestamp, message] pairs
     * @returns {Object} Mapping of URLs to metadata
     */
    extractLinks(messages) {
      // URL regex pattern
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const linkResults = {};
      
      for (const [timestamp, messageText] of messages) {
        // Extract sender name
        const colonIndex = messageText.indexOf(':');
        if (colonIndex === -1) continue; // Skip system messages
        
        const user = messageText.substring(0, colonIndex).trim();
        const content = messageText.substring(colonIndex + 1).trim();
        
        // Find URLs in message content
        let urlMatch;
        while ((urlMatch = urlPattern.exec(content)) !== null) {
          let url = urlMatch[0];
          
          // Clean up URL (remove trailing punctuation)
          if (['.', ',', ')', ']', '}', '"', "'", ';', ':'].includes(url.slice(-1))) {
            url = url.slice(0, -1);
          }
          
          // Store with metadata
          linkResults[url] = {
            user: user,
            timestamp: timestamp.substring(1, timestamp.length - 1) // Remove brackets
          };
        }
      }
      
      return linkResults;
    }
    
    /**
     * Get metadata for general web links using fetch HEAD requests
     * @param {string[]} links - Array of URLs to process
     * @returns {Promise<Object>} Object mapping URLs to title metadata
     */
    async analyseGeneralLinks(links) {
      const results = {};
      const corsProxyUrl = 'https://corsproxy.io/?'; // Public CORS proxy
      const fetchPromises = [];
      
      for (const url of links) {
        // Skip Spotify and YouTube links as they're handled separately
        if (url.includes('spotify') || url.includes('youtu')) continue;
        
        const fetchPromise = fetch(`${corsProxyUrl}${encodeURIComponent(url)}`, { method: 'GET' })
          .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            return response.text();
          })
          .then(html => {
            // Extract title from HTML
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              results[url] = {
                name: titleMatch[1].trim(),
                type: "website"
              };
            }
          })
          .catch(error => {
            console.error(`Error fetching metadata for ${url}:`, error);
            // Fallback
            results[url] = {
              name: new URL(url).hostname,
              type: "website"
            };
          });
        
        fetchPromises.push(fetchPromise);
      }
      
      // Try with limited concurrency to avoid overwhelming the CORS proxy
      const concurrencyLimit = 5;
      for (let i = 0; i < fetchPromises.length; i += concurrencyLimit) {
        const batch = fetchPromises.slice(i, i + concurrencyLimit);
        await Promise.all(batch);
      }
      
      return results;
    }
    
    /**
     * Process chat text to extract and enrich links
     * @param {string} chatText - Raw chat text content
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Array of link objects with metadata
     */
    async analyseChat(chatText, { expandSpotify = true, expandYoutube = true, expandGeneral = true } = {}) {
      const messages = this.extractEachMessage(chatText);
      const allLinks = this.extractLinks(messages);
      const linkUrls = Object.keys(allLinks);
      
      // Process different link types in parallel
      const [spotifyInfo, youtubeInfo, generalInfo] = await Promise.all([
        expandSpotify ? this.spotifyHelper.analyseSpotify(linkUrls) : {},
        expandYoutube ? this.youtubeHelper.analyseYoutube(linkUrls) : {},
        expandGeneral ? this.analyseGeneralLinks(linkUrls) : {}
      ]);
      
      // Merge metadata
      for (const url in allLinks) {
        allLinks[url] = {
          ...allLinks[url],
          ...(spotifyInfo[url] || {}),
          ...(youtubeInfo[url] || {}),
          ...(generalInfo[url] || {})
        };
        
        // Ensure URL is included
        allLinks[url].url = url;
      }
      
      // Convert to array for easier table display
      return Object.values(allLinks);
    }
  }