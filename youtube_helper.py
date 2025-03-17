import os
import re
import requests

API_KEY = os.environ["YOUTUBE_API_KEY"]
THUMBNAIL_URL = "https://img.youtube.com/vi/{video_id}/default.jpg"

def _get_youtube_video_id(video_url):
    pattern = r"(?:youtu\.be/|youtube\.com/(?:v/|watch\?v=|embed/))([\w-]{11})"
    match = re.search(pattern, video_url)
    if match:
        return match.group(1)
    else:
        print(f"Could not parse YT link {video_url}")
        return None    

def _get_youtube_video_title(video_id):
    # Define the API endpoint
    api_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={API_KEY}"

    # Make a GET request to the API
    response = requests.get(api_url)
    
    # Parse the response
    if response.status_code == 200:
        video_info = response.json()
        if len(video_info["items"]) == 0:
            print(f"Could not find title for {video_id}, Response: {video_info}")
            return None
        title = video_info["items"][0]["snippet"]["title"]
        return title
    else:
        print(f"YT video details could not be found for {api_url} for error: {response.status_code}, {response.text}")
        return None

def analyse_youtube(links):
    ret = {}
    
    for link in links:
        if link.find("youtu") > 0:
            video_id = _get_youtube_video_id(link)
            if not video_id:
                print(f"Could not fetch video id for {link}")
                continue
            
            name = _get_youtube_video_title(video_id)
            if not name:
                name = link 
            ret[link] = {"name": name, "type": "video", "image_url": THUMBNAIL_URL.format(video_id=video_id)}
            
    return ret