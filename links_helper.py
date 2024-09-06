from collections import OrderedDict

import os, sys
sys.path.append(os.path.dirname(os.path.realpath(__file__)))
import re

from spotify_helper import SpotifyAPIHelper
from youtube_helper import analyse_youtube

import re

SWEATING_PLAYLIST_NAME = "Sweating"

PROD_MODE = os.environ.get("SHAREVAULT_MODE")

def _extract_each_message(text):
    # Regex pattern to match the timestamp format
    timestamp_pattern = r'\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]'
    
    # Find all positions of timestamps in the text
    timestamps = [(match.start(), match.group()) for match in re.finditer(timestamp_pattern, text)]
    
    # List to store the results
    results = []
    
    # Iterate through the timestamps, extracting the text between them
    for i in range(len(timestamps) - 1):
        start_pos, start_timestamp = timestamps[i]
        end_pos, _ = timestamps[i + 1]
        
        # Extract the substring between the current and the next timestamp
        substring = text[start_pos + len(start_timestamp):end_pos].strip()
        
        # Add the result (starting timestamp and substring) to the list
        results.append((start_timestamp, substring))
    
    # Handle the last timestamp (text after the last timestamp to the end)
    if timestamps:
        start_pos, start_timestamp = timestamps[-1]
        substring = text[start_pos + len(start_timestamp):].strip()
        results.append((start_timestamp, substring))
    
    return results

# def _extract_links(chat_text):    
#     # Regular expression to capture timestamps with either '.' or '/' as date separators and URLs
#     # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (https?://[^\s]+)'
#     pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'
#     # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'

#     # Find all matches with timestamps, names, and URLs
#     matches = re.findall(pattern, chat_text, re.DOTALL)

#     links_with_timestamps = {}    
#     for match in matches:
#         print(f"{match=}")
        
#         timestamp = match[0][1:len(match[0]) - 1]
        
#         user = match[1][0:match[1].index(":")] if match[1].find(":") >= 0 else match[1]
#         user = user.split()[0]
        
#         url = match[2]
        
#         links_with_timestamps[url] = {"user": user, "timestamp": timestamp}

#     all_urls = re.findall(r'(https?://[^\s]+)', chat_text)
    
#     ret = OrderedDict()
#     for url in all_urls:
#         timestamp = ""
#         user = ""
#         if url in links_with_timestamps:
#             timestamp = links_with_timestamps[url]["timestamp"]
#             user = links_with_timestamps[url]["user"]
            
#         ret[url] = {"user": user, "timestamp": timestamp}
        
#     return ret

def _extract_links(messages):    
    # Regular expression to capture timestamps with either '.' or '/' as date separators and URLs
    # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (https?://[^\s]+)'
    # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'
    # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'

    pattern = r'(.+?): (.*?)(https?://[^\s]+)'

    links_with_timestamps = OrderedDict()
    for message in messages:
        # Find all matches with timestamps, names, and URLs
        matches = re.findall(pattern, message[1], re.DOTALL)

        for match in matches:
            # print(f"{match=}")
            
            timestamp = message[0][1:len(message[0]) - 1]
            
            user = match[0][0:match[0].index(":")] if match[0].find(":") >= 0 else match[0]
            user = user.split()[0]
            
            url = match[2]
            
            links_with_timestamps[url] = {"user": user, "timestamp": timestamp}

    # all_urls = re.findall(r'(https?://[^\s]+)', chat_text)
    
    # ret = OrderedDict()
    # for url in all_urls:
    #     timestamp = ""
    #     user = ""
    #     if url in links_with_timestamps:
    #         timestamp = links_with_timestamps[url]["timestamp"]
    #         user = links_with_timestamps[url]["user"]
            
    #     ret[url] = {"user": user, "timestamp": timestamp}
        
    # return ret
    return links_with_timestamps

def _read_file(filename):
    with open(filename, "r") as file:
        return file.read()

def analyse_chat(filename, expand_spotify=True, expand_youtube=True, update_sweating=False):    
    chat_text = _read_file(filename)
    if PROD_MODE and PROD_MODE == "PROD":
        os.remove(filename)

    messages = _extract_each_message(chat_text)
    all_links = _extract_links(messages)

    if expand_spotify:
        o = SpotifyAPIHelper()
        spotify_info = o.analyse_spotify(all_links.keys())
        for id in spotify_info:
            all_links[id] = {**all_links[id], **spotify_info[id]}

        if update_sweating:
            track_uris = [link["url"] for link in all_links if link["type"] == "track"]
            o.update_playlist(SWEATING_PLAYLIST_NAME, track_uris)    
            
    if expand_youtube:
        youtube_info = analyse_youtube(all_links.keys())
        for id in youtube_info:
            all_links[id] = {**all_links[id], **youtube_info[id]}
        
    ret = []
    for url in all_links:
        new_link_obj = all_links[url]
        new_link_obj["url"] = url
        ret.append(new_link_obj)
        
    return ret
    
if __name__ == "__main__":    
    print(analyse_chat("/tmp/sharevault.txt"))
