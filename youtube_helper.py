import os
import requests

API_KEY = os.environ["YOUTUBE_API_KEY"]

def _get_youtube_video_title(video_url):
    # Extract the video ID from the URL
    try:
        video_id = video_url.split("v=")[1].split("&")[0]
    except Exception as e:
        print(f"Could not split {video_url}")
        return None

    # Define the API endpoint
    api_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={API_KEY}"

    # Make a GET request to the API
    response = requests.get(api_url)
    
    # Parse the response
    if response.status_code == 200:
        video_info = response.json()
        if len(video_info["items"]) == 0:
            print(f"Could not find title for {video_url}, Response: {video_info}")
            return None
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