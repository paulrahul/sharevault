import os
import requests

API_KEY = os.environ["YOUTUBE_API_KEY"]

def _get_youtube_video_title(video_url):
    # Extract the video ID from the URL
    video_id = video_url.split("v=")[1].split("&")[0]

    # Define the API endpoint
    api_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={API_KEY}"

    # Make a GET request to the API
    response = requests.get(api_url)
    
    # Parse the response
    if response.status_code == 200:
        video_info = response.json()
        title = video_info["items"][0]["snippet"]["title"]
        return title
    else:
        return None

def analyse_youtube(links):
    ret = {}
    
    for link in links:
        if link.find("youtube") > 0:
            ret[link] = {"name": _get_youtube_video_title(link), "type": "video"}
            
    return ret