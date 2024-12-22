import concurrent.futures
import os
import re

import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials

SPOTIFY_USER_ID = os.environ["SPOTIFY_USER_ID"]

SPOTIFY_SCOPE = "user-library-read playlist-modify-public"

# Spotify API limit for track IDs per request
MAX_IDS_PER_REQUEST = 50

def chunk_list(lst, chunk_size):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

class SpotifyAPIHelper:
    def __init__(self):
        # self._auth_manager = SpotifyClientCredentials()
        # self._sp = spotipy.Spotify(auth_manager=self._auth_manager)
        
        self._sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope=SPOTIFY_SCOPE))

    def _playlist_exists(self, name):
        playlists = self._sp.user_playlists(SPOTIFY_USER_ID)
        for p in playlists["items"]:
            if p["name"] == name:
                return p["id"]

        return None
    
    def search_track(self, name):
        q = f"track:{name}"
        results = self._sp.search(q)
        
        if "tracks" in results and len(results["tracks"]["items"]) > 0:
            return results["tracks"]["items"][0]["external_urls"]["spotify"]
        else:
            return None
     
    def _create_playlist(self, name):
        playlist = self._sp.user_playlist_create(SPOTIFY_USER_ID, name)
        return playlist["id"]
    
    def update_playlist(self, name, track_uris):
        playlist_id = self._playlist_exists(name)
        existing_tracks = set()
        if not playlist_id:
            print(f"Creating playlist {name}")
            playlist_id = self._create_playlist(name)
        else:
            playlist_items = self._sp.playlist_tracks(playlist_id)
            for item in playlist_items["items"]:
                existing_tracks.add(item["track"]["external_urls"]["spotify"])
    
        # print(f"Tracks to be added: {track_uris}\n\n")
        # print(f"Existing tracks: {existing_tracks}\n\n")
        new_tracks = set(track_uris) - existing_tracks
            
        if len(new_tracks) > 0:
            print(f"Adding tracks {new_tracks} to playlist {playlist_id}")
            self._sp.playlist_add_items(playlist_id, new_tracks)

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
    
    def _get_tracks(self, track_ids):
        ret = {}
        
        if len(track_ids) > 0:            
            for chunk in chunk_list(list(track_ids.keys()), MAX_IDS_PER_REQUEST):    
                tracks = self._sp.tracks(chunk)
                for track in tracks["tracks"]:
                    track_name = track["name"]
                    artists = ", ".join([a["name"] for a in track["artists"]])
                    
                    link_url = track_ids[track["id"]]
                    ret[link_url] = {
                        "name": track_name, 
                        "artists": artists,
                        "type": "track"
                    }
                    
                    images = track["album"]["images"]
                    if len(images) > 0:
                        ret[link_url]["image_url"] = images[0]["url"]

        return ret
    
    def _get_playlists(self, playlist_ids):
        ret = {}
        
        for playlist_id in playlist_ids:
            playlist = self._sp.playlist(playlist_id)
            
            link_url = playlist_ids[playlist_id]
            ret[link_url] = {
                "name": playlist["name"], 
                "type": "playlist"
            }
            
            if len(playlist["images"]) > 0:
                ret[link_url]["image_url"] = playlist["images"][0]["url"]
        
        return ret
    
    def _get_albums(self, album_ids):
        ret = {}

        if len(album_ids) > 0:
            albums = self._sp.albums(list(album_ids.keys()))
            for album in albums["albums"]:
                album_name = album["name"]
                artists = ", ".join([a["name"] for a in album["artists"]])
                
                link_url = album_ids[album["id"]]
                ret[link_url] = {
                    "name": album_name, 
                    "artists": artists,
                    "type": "album"
                }
                
                if len(album["images"]) > 0:
                    ret[link_url]["image_url"] = album["images"][0]["url"]
 
        return ret

    def _get_artists(self, artist_ids):
        ret = {}

        if len(artist_ids) > 0:
            artists = self._sp.artists(list(artist_ids.keys()))
            for artist in artists["artists"]:
                artist_name = artist["name"]
                
                link_url = artist_ids[artist["id"]]
                ret[link_url] = {
                    "name": artist_name, 
                    "type": "artist"
                }
                
                if len(artist["images"]) > 0:
                    ret[link_url]["image_url"] = artist["images"][0]["url"]
 
        return ret

    def _parallel_get_data(self, track_ids, album_ids, playlist_ids, artist_ids):
        # Create a ThreadPoolExecutor to manage threads
        with concurrent.futures.ThreadPoolExecutor() as executor:
            # Submit all four tasks to the executor
            future_tracks = executor.submit(self._get_tracks, track_ids)
            future_albums = executor.submit(self._get_albums, album_ids)
            future_playlists = executor.submit(self._get_playlists, playlist_ids)
            future_artists = executor.submit(self._get_artists, artist_ids)
            
            # Wait for all the futures to complete and collect the results
            ret = {}
            
            # Combine the results into the ret dictionary
            ret.update(future_tracks.result())
            ret.update(future_albums.result())
            ret.update(future_playlists.result())
            ret.update(future_artists.result())
            
        # Return the combined result
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
        
        return self._parallel_get_data(
            track_ids, album_ids, playlist_ids, artist_ids)
                
            