import os
import re

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

user_id = os.environ['SPOTIFY_USER_ID']

class SpotifyAPIHelper:
    def __init__(self):
        self._auth_manager = SpotifyClientCredentials()
        self._sp = spotipy.Spotify(auth_manager=self._auth_manager)


    def _extract_spotify_url_bits(self, links):
        # Regular expression to explicitly match URLs starting with 'https://open.spotify.com/'
        pattern = r'https://open\.spotify\.com/([^/]+)/([^?]+)'

        ret = []        
        for url in links:
            if url.find("spotify") < 0:
                continue

            # Search for matches
            match = re.search(pattern, url)
            
            if match:
                word = match.group(1)  # The word (e.g., "playlist")
                id_value = match.group(2)  # The ID (e.g., "37i9dQZF1DWYCFWZy4Gz9M")
                ret.append({"url": url, "type": word, "id": id_value})
            else:
                print(f"Could not parse Spotify URL: {url}")
                
        return ret

    def analyse_spotify(self, links):
        # For each Spotify link, get ID and link type.
        spotify_bits = self._extract_spotify_url_bits(links)

        track_ids = {}
        playlist_ids = {}
        album_ids = {}
        artist_ids = {}        
        for row in spotify_bits:
            type = row["type"]
            id = row["id"]
            url = row["url"]
            
            if type == "track":
                track_ids[id] = url
            elif type == "album":
                album_ids[id] = url
            elif type == "playlist":
                playlist_ids[id] = url
            elif type == "artist":
                artist_ids[id] = url
            else:
                print(f"Unknown type: {type}")
        
        ret = {}
        
        if len(track_ids) > 0:
            tracks = self._sp.tracks(list(track_ids.keys()))
            for track in tracks["tracks"]:
                track_name = track["name"]
                artists = ", ".join([a["name"] for a in track["artists"]])
                ret[track_ids[track["id"]]] = {
                    "name": track_name, 
                    "artists": artists,
                    "type": "track"
                }
        
        return ret
                
            