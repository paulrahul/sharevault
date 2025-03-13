const SpotifyWebApi = require('spotify-web-api-node');

const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID;
const SPOTIFY_SCOPE = "user-library-read playlist-modify-public";

// Spotify API limit for track IDs per request
const MAX_IDS_PER_REQUEST = 50;

function chunkList(lst, chunkSize) {
  const chunks = [];
  for (let i = 0; i < lst.length; i += chunkSize) {
    chunks.push(lst.slice(i, i + chunkSize));
  }
  return chunks;
}

class SpotifyAPIHelper {
  constructor() {
    this._sp = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
      refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
    });

    this._sp.setAccessToken(process.env.SPOTIFY_ACCESS_TOKEN);
    
    // Refresh token on initialization
    this._refreshAccessToken();
  }
  
  async _refreshAccessToken() {
    try {
      const data = await this._sp.refreshAccessToken();
      this._sp.setAccessToken(data.body.access_token);
    } catch (error) {
      console.error('Could not refresh access token', error);
    }
  }

  async _playlistExists(name) {
    try {
      const data = await this._sp.getUserPlaylists(SPOTIFY_USER_ID);
      for (const p of data.body.items) {
        if (p.name === name) {
          return p.id;
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking if playlist exists:', error);
      return null;
    }
  }
  
  async searchTrack(name) {
    try {
      const q = `track:${name}`;
      const results = await this._sp.searchTracks(q);
      
      if (results.body.tracks && results.body.tracks.items.length > 0) {
        return results.body.tracks.items[0].external_urls.spotify;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error searching track:', error);
      return null;
    }
  }
     
  async _createPlaylist(name) {
    try {
      const playlist = await this._sp.createPlaylist(SPOTIFY_USER_ID, {
        name: name,
        public: true
      });
      return playlist.body.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  }
  
  async updatePlaylist(name, trackUris) {
    try {
      let playlistId = await this._playlistExists(name);
      const existingTracks = new Set();
      
      if (!playlistId) {
        console.log(`Creating playlist ${name}`);
        playlistId = await this._createPlaylist(name);
      } else {
        const playlistItems = await this._sp.getPlaylistTracks(playlistId);
        for (const item of playlistItems.body.items) {
          existingTracks.add(item.track.external_urls.spotify);
        }
      }
    
      const newTracks = trackUris.filter(uri => !existingTracks.has(uri));
            
      if (newTracks.length > 0) {
        console.log(`Adding tracks ${newTracks} to playlist ${playlistId}`);
        await this._sp.addTracksToPlaylist(playlistId, newTracks);
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  }

  _extractSpotifyUrlBits(links) {
    // Regular expression to explicitly match URLs starting with 'https://open.spotify.com/'
    const pattern = /https:\/\/open\.spotify\.com\/([^/]+)\/([^?]+)/;

    const ret = [];        
    for (const url of links) {
      if (url.indexOf("spotify") < 0) {
        continue;
      }

      // Search for matches
      const match = pattern.exec(url);
      
      if (match) {
        const word = match[1];  // The word (e.g., "playlist")
        const idValue = match[2];  // The ID (e.g., "37i9dQZF1DWYCFWZy4Gz9M")
        ret.push({ url, type: word, id: idValue });
      } else {
        console.log(`Could not parse Spotify URL: ${url}`);
      }
    }
    
    return ret;
  }
  
  async _getTracks(trackIds) {
    const ret = {};
    
    if (Object.keys(trackIds).length > 0) {
      try {
        for (const chunk of chunkList(Object.keys(trackIds), MAX_IDS_PER_REQUEST)) {    
          const response = await this._sp.getTracks(chunk);
          for (const track of response.body.tracks) {
            const trackName = track.name;
            const artists = track.artists.map(a => a.name).join(", ");
            
            const linkUrl = trackIds[track.id];
            ret[linkUrl] = {
              name: trackName, 
              artists: artists,
              type: "track"
            };
            
            const images = track.album.images;
            if (images.length > 0) {
              ret[linkUrl].image_url = images[0].url;
            }
          }
        }
      } catch (error) {
        console.error('Error getting tracks:', error);
      }
    }

    return ret;
  }
  
  async _getPlaylists(playlistIds) {
    const ret = {};
    
    for (const playlistId of Object.keys(playlistIds)) {
      try {
        const playlist = await this._sp.getPlaylist(playlistId);
        
        const linkUrl = playlistIds[playlistId];
        ret[linkUrl] = {
          name: playlist.body.name, 
          type: "playlist"
        };
        
        if (playlist.body.images.length > 0) {
          ret[linkUrl].image_url = playlist.body.images[0].url;
        }
      } catch (error) {
        console.log(`Could not find playlist ${playlistId}: ${error.message}`);
      }
    }
    
    return ret;
  }
  
  async _getAlbums(albumIds) {
    const ret = {};

    if (Object.keys(albumIds).length > 0) {
      try {
        const response = await this._sp.getAlbums(Object.keys(albumIds));
        for (const album of response.body.albums) {
          const albumName = album.name;
          const artists = album.artists.map(a => a.name).join(", ");
          
          const linkUrl = albumIds[album.id];
          ret[linkUrl] = {
            name: albumName, 
            artists: artists,
            type: "album"
          };
          
          if (album.images.length > 0) {
            ret[linkUrl].image_url = album.images[0].url;
          }
        }
      } catch (error) {
        console.error('Error getting albums:', error);
      }
    }

    return ret;
  }

  async _getArtists(artistIds) {
    const ret = {};

    if (Object.keys(artistIds).length > 0) {
      try {
        const response = await this._sp.getArtists(Object.keys(artistIds));
        for (const artist of response.body.artists) {
          const artistName = artist.name;
          
          const linkUrl = artistIds[artist.id];
          ret[linkUrl] = {
            name: artistName, 
            type: "artist"
          };
          
          if (artist.images.length > 0) {
            ret[linkUrl].image_url = artist.images[0].url;
          }
        }
      } catch (error) {
        console.error('Error getting artists:', error);
      }
    }

    return ret;
  }

  async _parallelGetData(trackIds, albumIds, playlistIds, artistIds) {
    // Run all API calls in parallel using Promise.all
    const [tracks, albums, playlists, artists] = await Promise.all([
      this._getTracks(trackIds),
      this._getAlbums(albumIds),
      this._getPlaylists(playlistIds),
      this._getArtists(artistIds)
    ]);
    
    // Combine the results
    return {
      ...tracks,
      ...albums,
      ...playlists,
      ...artists
    };
  }
      
  async analyseSpotify(links) {
    // For each Spotify link, get ID and link type.
    const spotifyBits = this._extractSpotifyUrlBits(links);

    const trackIds = {};
    const playlistIds = {};
    const albumIds = {};
    const artistIds = {};        
    for (const row of spotifyBits) {
      const type = row.type;
      const id = row.id;
      const url = row.url;
      
      if (type === "track") {
        trackIds[id] = url;
      } else if (type === "album") {
        albumIds[id] = url;
      } else if (type === "playlist") {
        playlistIds[id] = url;
      } else if (type === "artist") {
        artistIds[id] = url;
      } else {
        console.log(`Unknown type: ${type}`);
      }
    }
    
    return await this._parallelGetData(
      trackIds, albumIds, playlistIds, artistIds);
  }
}

module.exports = {
  SpotifyAPIHelper,
  chunkList
};