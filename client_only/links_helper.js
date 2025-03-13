const { OrderedDict } = require('./collections');
const path = require('path');
const fs = require('fs');
const { SpotifyAPIHelper } = require('./spotify_helper');
const { analyseYoutube } = require('./youtube_helper');

const SWEATING_PLAYLIST_NAME = "Sweating";
const PROD_MODE = process.env.SHAREVAULT_MODE;

function _extractEachMessage(text) {
  const timestampPattern = /\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]/g;
  const timestamps = [];
  let match;

  while ((match = timestampPattern.exec(text)) !== null) {
    timestamps.push({ start: match.index, timestamp: match[0] });
  }

  const results = [];

  for (let i = 0; i < timestamps.length - 1; i++) {
    const { start, timestamp } = timestamps[i];
    const endPos = timestamps[i + 1].start;
    const substring = text.substring(start + timestamp.length, endPos).trim();
    results.push([timestamp, substring]);
  }

  if (timestamps.length > 0) {
    const { start, timestamp } = timestamps[timestamps.length - 1];
    const substring = text.substring(start + timestamp.length).trim();
    results.push([timestamp, substring]);
  }

  return results;
}

function _extractLinks(messages) {
  const pattern = /(.+?): (.*?)(https?:\/\/[^\s]+)/;
  const linksWithTimestamps = new OrderedDict();

  for (const message of messages) {
    const matches = [];
    const messageText = message[1];
    let m;
    const regex = new RegExp(pattern, 'g');

    while ((m = regex.exec(messageText)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      matches.push(m);
    }

    for (const match of matches) {
      const timestamp = message[0].substring(1, message[0].length - 1);
      let user = match[1].split(' ')[0];
      let url = match[3].split('?')[0];

      linksWithTimestamps[url] = { user, timestamp };
    }
  }

  return linksWithTimestamps;
}

function _readFile(filename) {
  return fs.readFileSync(filename, 'utf8');
}

async function analyseChat(filename, { expandSpotify = true, expandYoutube = true, updateSweating = false } = {}) {
  const chatText = _readFile(filename);
  if (PROD_MODE === "PROD") {
    fs.unlinkSync(filename);
  }

  const messages = _extractEachMessage(chatText);
  const allLinks = _extractLinks(messages);
  const spotifyHelper = new SpotifyAPIHelper();

  if (expandSpotify) {
    const spotifyInfo = await spotifyHelper.analyseSpotify(Object.keys(allLinks));

    for (const id in spotifyInfo) {
      allLinks[id] = { ...allLinks[id], ...spotifyInfo[id] };
    }

    if (updateSweating) {
      const trackUris = Object.entries(allLinks)
        .filter(([_, link]) => link.type === "track")
        .map(([url, _]) => url);

      await spotifyHelper.updatePlaylist(SWEATING_PLAYLIST_NAME, trackUris);
    }
  }

  if (expandYoutube) {
    const youtubeInfo = analyseYoutube(Object.keys(allLinks));
    const spotifyTrackUris = [];

    for (const id in youtubeInfo) {
      allLinks[id] = { ...allLinks[id], ...youtubeInfo[id] };

      if (expandSpotify) {
        const spotifyTrackUri = await spotifyHelper.searchTrack(youtubeInfo[id].name);
        if (spotifyTrackUri) {
          spotifyTrackUris.push(spotifyTrackUri);
        }
      }
    }

    if (updateSweating && expandSpotify && spotifyTrackUris.length > 0) {
      await spotifyHelper.updatePlaylist(SWEATING_PLAYLIST_NAME, spotifyTrackUris);
    }
  }

  return Object.entries(allLinks).map(([url, link]) => ({ ...link, url }));
}

// Remove old `analyseChatSync` since it cannot handle async functions correctly
module.exports = { analyseChat };

// For direct execution
if (require.main === module) {
  analyseChat("/tmp/sharevault.txt").then(console.log).catch(console.error);
}
