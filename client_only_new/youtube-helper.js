/**
 * Client-side YouTube link helper
 * Uses YouTube's oEmbed API which is CORS-friendly
 */
class YouTubeHelper {
    /**
     * Extract YouTube video ID from URL
     * @param {string} videoUrl - YouTube URL
     * @returns {string|null} Video ID or null if not found
     */
    getYoutubeVideoId(videoUrl) {
      const pattern = /(?:youtu\.be\/|youtube\.com\/(?:v\/|watch\?v=|embed\/)([\w-]{11}))/;
      const match = videoUrl.match(pattern);
      
      if (match && match[1]) {
        return match[1];
      }
      
      return null;
    }
    
    /**
     * Get YouTube video metadata using oEmbed API
     * @param {string[]} links - Array of YouTube URLs
     * @returns {Promise<Object>} Object mapping URLs to their metadata
     */
    async analyseYoutube(links) {
      const results = {};
      const fetchPromises = [];
      
      for (const link of links) {
        if (!link.includes("youtu")) continue;
        
        const videoId = this.getYoutubeVideoId(link);
        if (!videoId) continue;
        
        // Create a thumbnail URL
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
        
        // Use YouTube's oEmbed API (CORS-friendly)
        const fetchPromise = fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(link)}&format=json`)
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error(`Failed to fetch metadata for ${link}`);
          })
          .then(data => {
            results[link] = {
              name: data.title,
              type: "video",
              image_url: thumbnailUrl
            };
          })
          .catch(error => {
            console.error(error);
            // Fallback with just the ID and thumbnail if API fails
            results[link] = {
              name: `YouTube Video (${videoId})`,
              type: "video",
              image_url: thumbnailUrl
            };
          });
        
        fetchPromises.push(fetchPromise);
      }
      
      // Wait for all fetch operations to complete
      await Promise.all(fetchPromises);
      
      return results;
    }
  }