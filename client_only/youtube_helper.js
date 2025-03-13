const axios = require('axios');

const API_KEY = process.env.YOUTUBE_API_KEY;
const THUMBNAIL_URL = "https://img.youtube.com/vi/{video_id}/default.jpg";

function _getYoutubeVideoId(videoUrl) {
  const pattern = /(?:youtu\.be\/|youtube\.com\/(?:v\/|watch\?v=|embed\/)([\w-]{11}))/;
  const match = videoUrl.match(pattern);
  
  if (match && match[1]) {
    return match[1];
  } else {
    console.log(`Could not parse YT link ${videoUrl}`);
    return null;
  }
}

async function _getYoutubeVideoTitle(videoId) {
  // Define the API endpoint
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;

  try {
    // Make a GET request to the API
    const response = await axios.get(apiUrl);
    
    // Parse the response
    if (response.status === 200) {
      const videoInfo = response.data;
      if (videoInfo.items.length === 0) {
        console.log(`Could not find title for video ID ${videoId}, Response:`, videoInfo);
        return null;
      }
      const title = videoInfo.items[0].snippet.title;
      return title;
    } else {
      console.log(`YT video details could not be found for ${apiUrl} for error: ${response.status}, ${response.statusText}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching YouTube video title:`, error.message);
    return null;
  }
}

async function analyseYoutube(links) {
  const ret = {};
  
  for (const link of links) {
    if (link.indexOf("youtu") > 0) {
      const videoId = _getYoutubeVideoId(link);
      if (!videoId) {
        console.log(`Could not fetch video id for ${link}`);
        continue;
      }
      
      let name = await _getYoutubeVideoTitle(videoId);
      if (!name) {
        name = link;
      }
      
      ret[link] = {
        name: name, 
        type: "video", 
        image_url: THUMBNAIL_URL.replace('{video_id}', videoId)
      };
    }
  }
  
  return ret;
}

// Synchronous version using mock data for testing or when API is unavailable
function analyseYoutubeSync(links) {
  const ret = {};
  
  for (const link of links) {
    if (link.indexOf("youtu") > 0) {
      const videoId = _getYoutubeVideoId(link);
      if (!videoId) {
        console.log(`Could not fetch video id for ${link}`);
        continue;
      }
      
      ret[link] = {
        name: `Video ${videoId}`, // Mock name
        type: "video", 
        image_url: THUMBNAIL_URL.replace('{video_id}', videoId)
      };
    }
  }
  
  return ret;
}

module.exports = {
  analyseYoutube,
  analyseYoutubeSync,
  _getYoutubeVideoId,
  _getYoutubeVideoTitle
};