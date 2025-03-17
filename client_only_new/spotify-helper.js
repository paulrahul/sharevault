/**
 * Client-side Spotify link helper
 * Uses the Spotify Embed API instead of requiring server credentials
 */
class SpotifyHelper {
    constructor() {
      // No auth needed for client-only implementation
    }
    
    /**
     * Extract Spotify URL components
     * @param {string[]} links - Array of URLs to process
     * @returns {Object[]} Array of objects containing URL type and ID
     */
    extractSpotifyUrlBits(links) {
      // Regular expression to match Spotify URLs
      const pattern = /https:\/\/open\.spotify\.com\/([^/]+)\/([^?]+)/;
      
      const results = [];
      for (const url of links) {
        if (!url.includes("spotify")) {
          continue;
        }
        
        const match = pattern.exec(url);
        
        if (match) {
          const type = match[1]; // track, album, playlist, artist
          const id = match[2];   // Spotify ID
          results.push({ url, type, id });
        }
      }
      
      return results;
    }
    
    /**
     * Get metadata for Spotify links using oEmbed API
     * @param {string[]} links - Array of Spotify URLs
     * @returns {Promise<Object>} Object mapping URLs to their metadata
     */
    async analyseSpotify(links) {
      const spotifyBits = this.extractSpotifyUrlBits(links);
      const results = {};
      
      // Process each Spotify link
      const fetchPromises = spotifyBits.map(async ({ url, type, id }) => {
        try {
          // Use Spotify's oEmbed API, which is CORS-friendly
          const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          
          if (response.ok) {
            const data = await response.json();
            
            // Extract title and thumbnail from oEmbed response
            results[url] = {
              name: data.title,
              type: type,
              image_url: data.thumbnail_url
            };
            
            // For tracks, extract artist from title (typically "Song - Artist")
            if (type === "track" && data.title.includes(" - ")) {
              const parts = data.title.split(" - ");
              results[url].name = parts[0].trim();
              results[url].artists = parts[1].trim();
            }
          }
        } catch (error) {
          console.error(`Error fetching Spotify metadata for ${url}:`, error);
        }
      });
      
      // Wait for all fetch operations to complete
      await Promise.all(fetchPromises);
      
      return results;
    }
  }